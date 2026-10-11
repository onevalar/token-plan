using TokenPlan.Core;
static class AmpProcessChecks
{
    public static async Task Run(string root, Action<bool, string> check)
    {
        var home = Path.Combine(root, "amp-process"); var bin = Path.Combine(home, "bin"); Directory.CreateDirectory(bin);
        if (OperatingSystem.IsWindows())
        {
            foreach (var file in Directory.EnumerateFiles(AppContext.BaseDirectory)) File.Copy(file, Path.Combine(bin, Path.GetFileName(file)), true);
            File.Copy(Path.Combine(AppContext.BaseDirectory, "TokenPlan.Core.Tests.exe"), Path.Combine(bin, "amp.exe"), true);
        }
        else
        {
            var path = Path.Combine(bin, "amp");
            File.WriteAllText(path, "#!/bin/sh\nif [ \"$TOKENPLAN_AMP_FIXTURE\" = error ]; then echo 'not logged in' >&2; exit 1; fi\nprintf 'Subscription Megawatt: 75%% agent usage and 50%% orb usage remaining\\nIndividual credits: $12.50 USD remaining\\n'\n");
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        var names = new[] { "PATH", "AMP_API_KEY", "AMP_URL", "TOKENPLAN_AMP_FIXTURE" };
        var old = names.ToDictionary(n => n, Environment.GetEnvironmentVariable);
        try
        {
            Environment.SetEnvironmentVariable("PATH", bin + Path.PathSeparator + old["PATH"]);
            Environment.SetEnvironmentVariable("AMP_API_KEY", "fixture-amp-key"); Environment.SetEnvironmentVariable("AMP_URL", "https://ampcode.com/"); Environment.SetEnvironmentVariable("TOKENPLAN_AMP_FIXTURE", "ok");
            using var service = new ProviderService(home, home, log: (_, _) => {}, userHome: home);
            var result = await service.Refresh("amp", default);
            check(result.ErrorKey == null && result.Snapshot?.Windows[0].UsedPercent == 25 && result.Snapshot.Windows[2].Amount == 12.5, "Amp process execution reads stdout and maps actual fixture CLI output");
            Environment.SetEnvironmentVariable("TOKENPLAN_AMP_FIXTURE", "error");
            result = await service.Refresh("amp", default);
            check(result.Snapshot == null && result.ErrorKey?.Contains("amp login") == true, "Amp stderr/nonzero exit becomes actionable login error");
        }
        finally { foreach (var name in names) Environment.SetEnvironmentVariable(name, old[name]); }
    }
}
