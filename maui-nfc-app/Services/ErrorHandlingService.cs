using System.Text.Json;

namespace MauiNfcApp.Services;

public interface IErrorHandlingService
{
    Task LogErrorAsync(string message, Exception? exception = null, Dictionary<string, object>? additionalData = null);
    Task<bool> ShowErrorDialogAsync(string title, string message, string? details = null);
    Task<bool> ShowConfirmDialogAsync(string title, string message);
    void ShowToast(string message, ToastType type = ToastType.Info);
}

public class ErrorHandlingService : IErrorHandlingService
{
    private readonly ILogger<ErrorHandlingService> _logger;

    public ErrorHandlingService(ILogger<ErrorHandlingService> logger)
    {
        _logger = logger;
    }

    public async Task LogErrorAsync(string message, Exception? exception = null, Dictionary<string, object>? additionalData = null)
    {
        try
        {
            var logEntry = new
            {
                Timestamp = DateTime.UtcNow,
                Message = message,
                Exception = exception?.ToString(),
                AdditionalData = additionalData,
                Platform = DeviceInfo.Platform.ToString(),
                AppVersion = AppInfo.VersionString
            };

            _logger.LogError(exception, "Error: {Message}, Data: {AdditionalData}", 
                message, JsonSerializer.Serialize(additionalData));

            // Gelecekte: Uzak logging servisi entegrasyonu
            // await SendToRemoteLoggingService(logEntry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging failed");
        }
    }

    public async Task<bool> ShowErrorDialogAsync(string title, string message, string? details = null)
    {
        try
        {
            var fullMessage = string.IsNullOrEmpty(details) ? message : $"{message}\n\nDetaylar:\n{details}";
            
            return await Application.Current?.MainPage?.DisplayAlert(title, fullMessage, "Tamam") ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing error dialog");
            return false;
        }
    }

    public async Task<bool> ShowConfirmDialogAsync(string title, string message)
    {
        try
        {
            return await Application.Current?.MainPage?.DisplayAlert(title, message, "Evet", "Hayır") ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing confirm dialog");
            return false;
        }
    }

    public void ShowToast(string message, ToastType type = ToastType.Info)
    {
        try
        {
            // Platform-specific toast implementation
            var icon = type switch
            {
                ToastType.Success => "✅",
                ToastType.Warning => "⚠️",
                ToastType.Error => "❌",
                _ => "ℹ️"
            };

            var fullMessage = $"{icon} {message}";
            
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                try
                {
                    // Basit bir toast implementasyonu
                    await Application.Current?.MainPage?.DisplayAlert("Bilgi", fullMessage, "Tamam");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error showing toast");
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ShowToast");
        }
    }
}

public enum ToastType
{
    Info,
    Success,
    Warning,
    Error
}
