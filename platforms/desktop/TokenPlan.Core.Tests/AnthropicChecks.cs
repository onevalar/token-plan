using System.Text.Json;
using System.Net;
using TokenPlan.Core;

static class AnthropicChecks {
 public static async Task Run(string root, Action<bool,string> check) {
  using var service = new ProviderService(root,root,handler:new Handler(),keys:new APIKeyStore(Path.Combine(root,"anthropic-test"),name=>name=="ANTHROPIC_ADMIN_KEY"?"fixture":null),log:(_,_)=>{});
  var result=await service.Refresh("anthropic",CancellationToken.None);
  check(result.Snapshot?.Id=="anthropic","Anthropic service registered");
  check(result.Snapshot?.History?.Days[0].Cost?.Dollars==1.25,"Anthropic cents converted to dollars");
  check(result.Snapshot?.History?.Days[0].Tokens.Total==900,"Anthropic total includes cached tokens once");
  foreach(var status in new[]{HttpStatusCode.Unauthorized,HttpStatusCode.Forbidden,HttpStatusCode.TooManyRequests}) {
   using var failed=new ProviderService(root,root,handler:new Handler(status),keys:new APIKeyStore(Path.Combine(root,"anthropic-errors"),_=>"fixture"),log:(_,_)=>{});
   check((await failed.Refresh("anthropic",CancellationToken.None)).Snapshot==null,"Anthropic status cannot become zero: "+status);
  }
  using var looping=new ProviderService(root,root,handler:new Handler(loop:true),keys:new APIKeyStore(Path.Combine(root,"anthropic-loop"),_=>"fixture"),log:(_,_)=>{});
  check((await looping.Refresh("anthropic",CancellationToken.None)).Snapshot==null,"Anthropic repeated pagination cursor fails");
  var now=DateTimeOffset.UtcNow;
  using var bad=JsonDocument.Parse("""{"starting_at":"2026-11-06T00:00:00Z","group":{},"usage":{"total_tokens":-1,"requests":0}}""");
  try { AnthropicUsageParser.Normalize(bad.RootElement,false,now.AddDays(-31),now);check(false,"Invalid counters rejected"); } catch(InvalidDataException) { check(true,"Invalid counters rejected"); }
  using var ordinary=new ProviderService(root,root,keys:new APIKeyStore(Path.Combine(root,"anthropic-missing"),name=>name=="ANTHROPIC_API_KEY"?"ordinary":null),log:(_,_)=>{});
  check((await ordinary.Refresh("anthropic",CancellationToken.None)).Snapshot==null,"Ordinary Anthropic model key not reused");
 }
 sealed class Handler(HttpStatusCode status=HttpStatusCode.OK,bool loop=false):HttpMessageHandler {
  protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellation) {
   if(request.RequestUri!.Host!="api.anthropic.com" || !request.Headers.Contains("x-api-key") || !request.Headers.Contains("anthropic-beta"))throw new InvalidDataException();
   var metric=request.RequestUri.AbsolutePath.EndsWith("/cost")?"\"cost\":{\"currency\":\"USD\",\"amount\":\"125.000000\"}":"\"usage\":{\"total_tokens\":900,\"requests\":2,\"cache_read_input_tokens\":600}";
   var date=DateTimeOffset.UtcNow.UtcDateTime.Date.ToString("yyyy-MM-ddTHH:mm:ssZ");
   return Task.FromResult(new HttpResponseMessage(status){Content=new StringContent("{\"data\":[{\"starting_at\":\""+date+"\",\"group\":{\"model\":\"claude-test\"},"+metric+"}],\"has_more\":"+(loop?"true":"false")+",\"next_page\":\"same\"}")});
  }
 }
}
