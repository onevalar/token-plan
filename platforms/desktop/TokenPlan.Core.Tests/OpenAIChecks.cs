using System.Net;
using System.Text;
using System.Text.Json;
using TokenPlan.Core;

static class OpenAIChecks
{
    public static async Task Run(string root, Action<bool,string> check)
    {
        var now = DateTimeOffset.Parse("2026-10-29T12:00:00Z");
        JsonElement Bucket(string row) => JsonDocument.Parse("{\"start_time\":1793145600,\"results\":[" + row + "]}").RootElement.Clone();
        var cost = Bucket("""{"amount":{"value":1.25,"currency":"usd"}}""");
        var usage = Bucket("""{"input_tokens":100,"input_cached_tokens":80,"output_tokens":50,"num_model_requests":2,"model":"test"}""");
        check(OpenAIUsageParser.Parse([],[],now).Windows.Count == 0,"Absent API buckets are not zero monthly usage");
        var snapshot = OpenAIUsageParser.Parse([cost],[usage],now);
        check(snapshot.History!.Days[0].Tokens.Total == 150,"OpenAI cached input is not counted twice");
        check(snapshot.History.Days[0].Cost is { Dollars:1.25, Priced:1, Unpriced:0 },"OpenAI daily costs retain official totals");
        check(snapshot.History.Days[0].Models![0].Cost.Unpriced == 1,"OpenAI does not invent per-model prices");
        check(snapshot.Windows.All(w=>w.Label!="Balance"),"OpenAI spend is not a prepaid balance");
        check(UsageParser.Parse("codex","""{"credits":{"balance":"12.375"}}""",now).Windows[0] is { Amount:12.375,Currency:"CREDITS" },"Codex credits retain fractions and units");
        check(UsageParser.Parse("codex","""{"credits":{"balance":"-0.25"}}""",now).Windows[0].Amount == -0.25,"Codex credits preserve negative balances");
        check(UsageParser.Parse("codex","""{"credits":{"unlimited":true,"balance":"0"}}""",now).Windows[0].StatusText == "Unlimited","Unlimited is not zero");
        check(UsageParser.Parse("codex","""{"credits":{"has_credits":false}}""",now).Windows[0].Amount == 0,"Measured zero is preserved");
        foreach (var status in new[]{HttpStatusCode.OK,HttpStatusCode.Forbidden,HttpStatusCode.Unauthorized,HttpStatusCode.TooManyRequests,HttpStatusCode.InternalServerError})
        {
            var keys = new APIKeyStore(Path.Combine(root,"openai-test"),name=> name=="OPENAI_ADMIN_KEY"?"fixture":null);
            using var handler = new Handler(status);
            using var service = new ProviderService(root,root,handler:handler,keys:keys,log:(_,_)=>{});
            var result = await service.Refresh("openai",CancellationToken.None);
            check(status==HttpStatusCode.OK?result.Snapshot?.History?.Days.Count==1:result.Snapshot==null && result.ErrorKey!=null,"OpenAI response status " + status);
        }
        using var missing = new ProviderService(root,root,keys:new APIKeyStore(Path.Combine(root,"missing-openai"),name=>name=="OPENAI_API_KEY"?"ordinary":null),log:(_,_)=>{});
        check((await missing.Refresh("openai",CancellationToken.None)).Snapshot==null,"Ordinary model key is not silently reused for admin reporting");
        using var repeated = new Handler(HttpStatusCode.OK,true);
        using var loops = new ProviderService(root,root,handler:repeated,keys:new APIKeyStore(Path.Combine(root,"loop-openai"),_=>"fixture"),log:(_,_)=>{});
        check((await loops.Refresh("openai",CancellationToken.None)).Snapshot==null,"Repeated pagination cursor cannot return partial totals");
    }
    sealed class Handler(HttpStatusCode status,bool loop=false):HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellation)
        {
            var row=request.RequestUri!.AbsolutePath.EndsWith("costs")?"""{"amount":{"value":1.25,"currency":"usd"}}""":"""{"input_tokens":100,"output_tokens":50,"num_model_requests":2,"model":"test"}""";
            return Task.FromResult(new HttpResponseMessage(status){Content=new StringContent("{\"data\":[{\"start_time\":1793145600,\"results\":["+row+"]}],\"has_more\":"+(loop?"true":"false")+",\"next_page\":\"same\"}",Encoding.UTF8,"application/json")});
        }
    }
}
