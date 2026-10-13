using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using TokenPlan.Core;

static class OAuthRenewalChecks
{
    const string ClaudeUsage = """{"five_hour":{"utilization":16}}""";
    const string CodexUsage = """{"plan_type":"pro","rate_limit":{"primary_window":{"used_percent":20,"limit_window_seconds":18000}}}""";
    static HttpResponseMessage Reply(HttpStatusCode status, string body = "{}") => new(status) { Content = new StringContent(body) };
    static string Credentials(string family, bool expired = false, string access = "old-secret") => family == "claude"
        ? new JsonObject { ["keep"]="root", ["claudeAiOauth"]=new JsonObject { ["accessToken"]=access, ["refreshToken"]="refresh-secret", ["subscriptionType"]="pro", ["keep"]="token", ["expiresAt"]=DateTimeOffset.UtcNow.AddHours(expired ? -1 : 1).ToUnixTimeMilliseconds() } }.ToJsonString()
        : new JsonObject { ["keep"]="root", ["tokens"]=new JsonObject { ["access_token"]=expired ? "e30." + Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"exp\":1}")).TrimEnd('=').Replace('+','-').Replace('/','_') + ".sig" : access, ["refresh_token"]="refresh-secret", ["account_id"]="account-test", ["keep"]="token" } }.ToJsonString();
    public static async Task Run(Action<bool,string> check)
    {
        var root = Path.Combine(Path.GetTempPath(), "tokenplan-oauth-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            foreach (var family in new[] { "claude", "codex" })
            {
                var path = Path.Combine(root, family == "claude" ? ".credentials.json" : "auth.json");
                string usage = family == "claude" ? ClaudeUsage : CodexUsage;
                ProviderService Service(HttpMessageHandler handler, List<string>? logs = null, bool renewable = true, TimeSpan? timeout = null) => new(root,root,handler,(_,message)=>logs?.Add(message),timeout,userHome:root,allowAuthRefresh:renewable);
                foreach (var proactive in new[] { true, false })
                {
                    await File.WriteAllTextAsync(path, Credentials(family,proactive));
                    var renewals=0; var oldCalls=0;
                    using var handler = new Stub(async (request,ct) => {
                        if (request.Method == HttpMethod.Post)
                        {
                            renewals++;
                            var body = await request.Content!.ReadAsStringAsync(ct);
                            check(body.Contains("refresh-secret") && body.Contains("refresh_token"), family+" renewal payload");
                            check(request.RequestUri!.Host == (family=="claude" ? "platform.claude.com" : "auth.openai.com") && request.Headers.Authorization == null, family+" credentials sent only to renewal endpoint");
                            return Reply(HttpStatusCode.OK,"""{"access_token":"new-secret","refresh_token":"rotated-secret","id_token":"identity","expires_in":3600}""");
                        }
                        if (request.RequestUri!.AbsolutePath.Contains("reset-credits")) return Reply(HttpStatusCode.NotFound);
                        if (request.Headers.Authorization?.Parameter != "new-secret") { oldCalls++; return Reply(HttpStatusCode.Unauthorized); }
                        if(family=="codex") check(request.Headers.GetValues("ChatGPT-Account-Id").Single()=="account-test", "Codex account preserved after renewal");
                        return Reply(HttpStatusCode.OK,usage);
                    });
                    using var service = Service(handler);
                    var result = await service.Refresh(family,CancellationToken.None);
                    var saved = JsonNode.Parse(await File.ReadAllTextAsync(path))!;
                    var tokens = saved[family=="claude"?"claudeAiOauth":"tokens"]!;
                    check(result.Snapshot != null && result.ErrorKey == null && renewals==1 && oldCalls==(proactive?0:1), family+" renews once and retries (proactive="+proactive+")");
                    check((string?)saved["keep"]=="root" && (string?)tokens["keep"]=="token" && (string?)tokens[family=="claude"?"refreshToken":"refresh_token"]=="rotated-secret",family+" saves rotation without deleting unrelated fields");
                    if(!OperatingSystem.IsWindows()) check((File.GetUnixFileMode(path) & (UnixFileMode.GroupRead|UnixFileMode.OtherRead))==0,"Saved credentials remain private");
                }
                foreach (var status in new[] { HttpStatusCode.Forbidden, HttpStatusCode.ProxyAuthenticationRequired })
                {
                    var original=Credentials(family); await File.WriteAllTextAsync(path,original); var calls=0;
                    using var handler = new Stub((_,_)=>{calls++;return Task.FromResult(Reply(status));});
                    using var service = Service(handler);
                    var result=await service.Refresh(family,CancellationToken.None);
                    check(calls==1 && result.ErrorKey!.Contains(status==HttpStatusCode.Forbidden?"403":"proxy") && await File.ReadAllTextAsync(path)==original,family+" permission/proxy rejection cannot rotate login");
                }
                foreach (var body in new[] { "{\"error\":\"invalid_grant\"}", "<html>blocked</html>" })
                {
                    var original=Credentials(family,true); await File.WriteAllTextAsync(path,original);
                    using var handler = new Stub((_,_)=>Task.FromResult(Reply(HttpStatusCode.BadRequest,body)));
                    using var service = Service(handler);
                    var result=await service.Refresh(family,CancellationToken.None);
                    check(result.ErrorKey!.Contains(body.StartsWith('{')?"rejected the renewal":"could not renew") && await File.ReadAllTextAsync(path)==original,family+" distinguishes invalid grant from non-OAuth gateway rejection");
                }
                await File.WriteAllTextAsync(path,Credentials(family,true));
                using (var handler = new Stub((request,_)=>{
                    check(request.Method==HttpMethod.Get,family+" snapshot never rotates shared token");
                    return Task.FromResult(Reply(HttpStatusCode.Unauthorized));
                }))
                using (var service=Service(handler,renewable:false))
                    check((await service.Refresh(family,CancellationToken.None)).ErrorKey!.Contains("account switcher"),family+" shared snapshot actionable error");
                // A CLI can switch accounts while a renewal is in flight. Never overwrite that login.
                await File.WriteAllTextAsync(path,Credentials(family,true));
                var changed=Credentials(family,access:"cli-new-secret");
                using (var handler = new Stub(async (request,_)=>{
                    if(request.Method==HttpMethod.Post) { await File.WriteAllTextAsync(path,changed); return Reply(HttpStatusCode.OK,"""{"access_token":"obsolete","refresh_token":"obsolete"}"""); }
                    if(request.RequestUri!.AbsolutePath.Contains("reset-credits"))return Reply(HttpStatusCode.NotFound);
                    check(request.Headers.Authorization?.Parameter=="cli-new-secret",family+" rereads concurrent CLI login");
                    return Reply(HttpStatusCode.OK,usage);
                }))
                using (var service=Service(handler))
                    check((await service.Refresh(family,CancellationToken.None)).Snapshot != null && await File.ReadAllTextAsync(path)==changed,family+" CLI change survives renewal");
                // Two refreshers sharing a file must not spend the same refresh token twice.
                await File.WriteAllTextAsync(path,Credentials(family,true)); var rotations=0;
                using (var handler = new Stub(async (request,ct)=>{
                    if(request.Method==HttpMethod.Post) { Interlocked.Increment(ref rotations); await Task.Delay(20,ct); return Reply(HttpStatusCode.OK,"""{"access_token":"fresh","refresh_token":"fresh-refresh","expires_in":3600}"""); }
                    return Reply(HttpStatusCode.OK,request.RequestUri!.AbsolutePath.Contains("reset-credits")?"{}":usage);
                }))
                using (var first=Service(handler)) using(var second=Service(handler))
                {
                    var results=await Task.WhenAll(first.Refresh(family,CancellationToken.None),second.Refresh(family,CancellationToken.None));
                    check(rotations==1 && results.All(r=>r.Snapshot!=null),family+" concurrent refreshes rotate once");
                }
                await File.WriteAllTextAsync(path,Credentials(family)); var rejectedCalls=0;
                using(var handler=new Stub((request,_)=>{
                    rejectedCalls++;
                    return Task.FromResult(request.Method==HttpMethod.Post ? Reply(HttpStatusCode.OK,"""{"access_token":"new-secret","refresh_token":"rotated-secret"}""") : Reply(HttpStatusCode.Unauthorized));
                }))
                using(var service=Service(handler))
                    check((await service.Refresh(family,CancellationToken.None)).ErrorKey!.Contains("renewed login was rejected") && rejectedCalls==3,family+" renewed 401 does not loop");
                await File.WriteAllTextAsync(path,Credentials(family,true)); var limitedCalls=0;
                using(var handler=new Stub((_,_)=>{limitedCalls++;return Task.FromResult(Reply(HttpStatusCode.TooManyRequests));}))
                using(var service=Service(handler))
                {
                    var first=await service.Refresh(family,CancellationToken.None);
                    var second=await service.Refresh(family,CancellationToken.None);
                    check(limitedCalls==1 && first.ErrorKey==second.ErrorKey && second.ErrorKey!.Contains("Rate limited"),family+" renewal respects cooldown");
                }
                if(!OperatingSystem.IsWindows())
                {
                    await File.WriteAllTextAsync(path,Credentials(family,true)); var saveRotations=0;
                    var mode=File.GetUnixFileMode(root);
                    try
                    {
                        using var handler=new Stub((request,_)=>{
                            if(request.Method==HttpMethod.Post) {saveRotations++;if(!OperatingSystem.IsWindows()) File.SetUnixFileMode(root,UnixFileMode.UserRead|UnixFileMode.UserExecute);return Task.FromResult(Reply(HttpStatusCode.OK,"""{"access_token":"pending-secret","refresh_token":"pending-refresh","expires_in":3600}"""));}
                            check(request.Headers.Authorization?.Parameter=="pending-secret",family+" recovered saved token used");
                            return Task.FromResult(Reply(HttpStatusCode.OK,request.RequestUri!.AbsolutePath.Contains("reset-credits")?"{}":usage));
                        });
                        using var service=Service(handler);
                        var failed=await service.Refresh(family,CancellationToken.None);
                        File.SetUnixFileMode(root,mode);
                        var recovered=await service.Refresh(family,CancellationToken.None);
                        check(failed.ErrorKey!.Contains("could not be saved") && recovered.Snapshot!=null && saveRotations==1 && (await File.ReadAllTextAsync(path)).Contains("pending-refresh"),family+" retries failed save without rotating again");
                    }
                    finally {File.SetUnixFileMode(root,mode);}
                }
                var missingRefresh = JsonNode.Parse(Credentials(family))!;
                ((JsonObject)missingRefresh[family=="claude"?"claudeAiOauth":"tokens"]!).Remove(family=="claude"?"refreshToken":"refresh_token");
                await File.WriteAllTextAsync(path,missingRefresh.ToJsonString());
                using(var handler=new Stub((request,_)=>{check(request.Method==HttpMethod.Get,"Missing refresh cannot send renewal");return Task.FromResult(Reply(HttpStatusCode.Unauthorized));}))
                using(var service=Service(handler))
                    check((await service.Refresh(family,CancellationToken.None)).ErrorKey!.Contains("cannot renew automatically"),family+" missing renewal credential explained");
                var beforeCancel=Credentials(family,true); await File.WriteAllTextAsync(path,beforeCancel);
                using(var cancellation=new CancellationTokenSource())
                using(var handler=new Stub(async (request,ct)=>{
                    check(request.Method==HttpMethod.Post,family+" cancellation reaches renewal request");
                    cancellation.Cancel(); await Task.Delay(1000,ct); return Reply(HttpStatusCode.OK);
                }))
                using(var service=Service(handler))
                {
                    var cancelled=false;
                    try {await service.Refresh(family,cancellation.Token);} catch(OperationCanceledException) {cancelled=true;}
                    check(cancelled && await File.ReadAllTextAsync(path)==beforeCancel,family+" cancellation before renewal response preserves credentials");
                }
                await File.WriteAllTextAsync(path,Credentials(family)); var usageCalls=0;
                using(var handler=new Stub(async(request,_)=>{
                    if(request.RequestUri!.AbsolutePath.Contains("reset-credits"))return Reply(HttpStatusCode.NotFound);
                    usageCalls++;
                    if(usageCalls==1)await File.WriteAllTextAsync(path,Credentials(family,access:"switched-during-usage"));
                    else check(request.Headers.Authorization?.Parameter=="switched-during-usage",family+" usage retry reads switched account");
                    return Reply(HttpStatusCode.OK,usage);
                }))
                using(var service=Service(handler))
                    check((await service.Refresh(family,CancellationToken.None)).Snapshot!=null && usageCalls==2,family+" successful usage cannot be attributed to a switched account");
                foreach(var error in new[] { HttpRequestError.NameResolutionError,HttpRequestError.SecureConnectionError,HttpRequestError.ProxyTunnelError })
                {
                    await File.WriteAllTextAsync(path,Credentials(family)); var logs=new List<string>();
                    using var handler = new Stub((_,_)=>throw new HttpRequestException(error,"private-secret-with-proxy-password"));
                    using var service=Service(handler,logs);
                    var result=await service.Refresh(family,CancellationToken.None);
                    check(result.ErrorKey != null && !result.ErrorKey.Contains("Sign in") && logs.Any(s=>s.Contains(error.ToString())) && logs.All(s=>!s.Contains("secret")&&!s.Contains("account-test")),family+" network diagnosis redacts credentials ("+error+")");
                }
                await File.WriteAllTextAsync(path,Credentials(family));
                using(var handler=new Stub(async (_,ct)=>{await Task.Delay(5000,ct);return Reply(HttpStatusCode.OK,usage);}))
                using(var service=Service(handler,timeout:TimeSpan.FromMilliseconds(50)))
                    check((await service.Refresh(family,CancellationToken.None)).ErrorKey!.Contains("proxy or VPN"),family+" timeout explains GUI connectivity");
            }
            // Optional reset-credit timeout must not hide an already-successful Codex quota response.
            await File.WriteAllTextAsync(Path.Combine(root,"auth.json"),Credentials("codex"));
            using(var handler=new Stub(async (request,ct)=>{
                if(request.RequestUri!.AbsolutePath.Contains("reset-credits"))await Task.Delay(5000,ct);
                return Reply(HttpStatusCode.OK,CodexUsage);
            }))
            using(var service=new ProviderService(root,root,handler,(_,_)=>{},TimeSpan.FromMilliseconds(100),userHome:root))
                check((await service.Refresh("codex",CancellationToken.None)).Snapshot!=null,"Codex optional metadata timeout preserves quota");
        }
        finally { Directory.Delete(root,true); }
    }
}
