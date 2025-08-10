using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.Nfc;
using Android.OS;
using MauiNfcReader.Platforms.Android.Services;

namespace MauiNfcReader;

[Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true, LaunchMode = LaunchMode.SingleTop, Exported = true,
          ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation | ConfigChanges.UiMode | ConfigChanges.ScreenLayout | ConfigChanges.SmallestScreenSize | ConfigChanges.Density)]
[IntentFilter(new[] { NfcAdapter.ActionTechDiscovered }, Categories = new[] { Intent.CategoryDefault })]
[MetaData("android.nfc.action.TECH_DISCOVERED", Resource = "@xml/nfc_tech_filter")]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnNewIntent(Intent? intent)
    {
        base.OnNewIntent(intent);
        if (intent is null) return;
        var svc = Microsoft.Maui.Controls.Application.Current?.Handler?.MauiContext?.Services.GetService(typeof(AndroidNfcService)) as AndroidNfcService;
        svc?.OnNewIntent(intent);
    }
}
