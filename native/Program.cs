using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace CastawayModern;
internal static class Program
{
    [STAThread] static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        string command = args.Length > 0 ? args[0].ToLowerInvariant() : "/c";
        bool saver = command.StartsWith("/s") || command == "--saver";
        bool preview = command.StartsWith("/p");
        nint parent = 0;
        if (preview)
        {
            string handle = command.Contains(':') ? command.Split(':')[1] : args.Length > 1 ? args[1] : "0";
            if (long.TryParse(handle, out long value)) parent = (nint)value;
            if (parent == 0 || !Native.IsWindow(parent)) return;
        }
        bool qa = args.Contains("--qa");
        try { Application.Run(new IslandForm(saver, preview, parent, qa)); }
        catch (Exception ex) { MessageBox.Show("Castaway could not start.\n\n" + ex.Message + "\n\nMicrosoft Edge WebView2 and the .NET 10 Desktop Runtime are required.", "Milo Maroon — A Little Island Life", MessageBoxButtons.OK, MessageBoxIcon.Information); }
    }
}
internal sealed class IslandForm : Form
{
    readonly WebView2 web = new();
    readonly bool saver, preview, qa;
    readonly nint parent;
    Rectangle savedBounds;
    bool fullscreen;
    readonly System.Windows.Forms.Timer idleTimer = new() { Interval = 200 };
    Point initialMouse;
    DateTime start;
    public IslandForm(bool saver, bool preview, nint parent, bool qa)
    {
        this.saver = saver; this.preview = preview; this.parent = parent; this.qa = qa;
        Text = "Milo Maroon — A Little Island Life"; BackColor = Color.FromArgb(17, 47, 56); MinimumSize = new Size(400, 250);
        Width = 1360; Height = 820; StartPosition = FormStartPosition.CenterScreen;
        if (preview) { MinimumSize = Size.Empty; FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; }
        if (saver) { FormBorderStyle = FormBorderStyle.None; Bounds = Screen.PrimaryScreen!.Bounds; TopMost = true; ShowInTaskbar = false; Cursor.Hide(); fullscreen = true; }
        web.Dock = DockStyle.Fill; web.DefaultBackgroundColor = BackColor; Controls.Add(web);
        Shown += async (_, _) => await Initialize();
        FormClosed += (_, _) => { idleTimer.Stop(); idleTimer.Dispose(); if (saver) Cursor.Show(); web.Dispose(); };
    }
    async Task Initialize()
    {
        try
        {
            if (preview) { Native.SetParent(Handle, parent); Native.SetWindowLongPtr(Handle, -16, (nint)(0x40000000L | 0x10000000L)); Native.GetClientRect(parent, out var rect); Bounds = new Rectangle(0, 0, rect.Right, rect.Bottom); }
            string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CastawayModern", qa ? "QAProfile-v28" : "WebViewProfile");
            var options = new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required" + (qa ? " --remote-debugging-port=9247" : ""));
            var environment = await CoreWebView2Environment.CreateAsync(null, data, options);
            await web.EnsureCoreWebView2Async(environment);
            var core = web.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false; core.Settings.IsStatusBarEnabled = false; core.Settings.AreDevToolsEnabled = qa; core.Settings.IsZoomControlEnabled = false;
            core.SetVirtualHostNameToFolderMapping("castaway.local", Path.Combine(AppContext.BaseDirectory, "app"), CoreWebView2HostResourceAccessKind.DenyCors);
            core.NewWindowRequested += (_, e) => e.Handled = true;
            core.NavigationStarting += (_, e) => { if (!e.Uri.StartsWith("https://castaway.local/", StringComparison.OrdinalIgnoreCase)) e.Cancel = true; };
            core.PermissionRequested += (_, e) => e.State = CoreWebView2PermissionState.Deny;
            core.WebMessageReceived += Message;
            core.Navigate("https://castaway.local/index.html?mode=" + (preview ? "preview" : saver ? "saver" : "app") + (qa ? "&qa=1" : ""));
            if (saver && !qa)
            {
                start = DateTime.Now; initialMouse = Cursor.Position;
                idleTimer.Tick += (_, _) => { if ((DateTime.Now - start).TotalSeconds < 2) { initialMouse = Cursor.Position; return; } var p = Cursor.Position; if (Math.Abs(p.X - initialMouse.X) + Math.Abs(p.Y - initialMouse.Y) > 18) Close(); };
                idleTimer.Start();
            }
        }
        catch (Exception ex) { MessageBox.Show("The island could not open.\n\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Information); Close(); }
    }
    void Message(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!e.Source.StartsWith("https://castaway.local/", StringComparison.OrdinalIgnoreCase)) return;
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson); string? type = doc.RootElement.GetProperty("type").GetString();
            if (type == "exit" && saver) Close();
            if (type == "fullscreen" && !saver && !preview) ToggleFullscreen();
            if (type == "escape" && fullscreen && !saver) ToggleFullscreen();
            if (type == "install" && !saver && !preview) Install();
            if (type == "qa-close" && qa) Close();
        }
        catch (JsonException) { }
    }
    void ToggleFullscreen()
    {
        if (!fullscreen) { savedBounds = Bounds; FormBorderStyle = FormBorderStyle.None; WindowState = FormWindowState.Normal; Bounds = Screen.FromControl(this).Bounds; }
        else { FormBorderStyle = FormBorderStyle.Sizable; Bounds = savedBounds; }
        fullscreen = !fullscreen;
    }
    void Install()
    {
        string script = Path.Combine(AppContext.BaseDirectory, "Install.ps1");
        if (!File.Exists(script)) { MessageBox.Show("Keep the complete application folder together, including Install.ps1.", Text); return; }
        var p = new ProcessStartInfo("powershell.exe") { UseShellExecute = false, CreateNoWindow = true };
        foreach (string arg in new[] { "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script }) p.ArgumentList.Add(arg);
        Process.Start(p);
    }
}
internal static class Native
{
    [DllImport("user32.dll")] internal static extern nint SetParent(nint child, nint parent);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] internal static extern nint SetWindowLongPtr(nint window, int index, nint value);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool GetClientRect(nint window, out Rect rect);
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)] internal static extern bool IsWindow(nint window);
    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int Left, Top, Right, Bottom; }
}
