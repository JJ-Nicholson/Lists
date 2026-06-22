using Microsoft.Extensions.Logging;

namespace Lists.Api.IntegrationTests;

public record TestLogEntry(
    string Category,
    LogLevel Level,
    string Message,
    Exception? Exception);

public class TestLoggerProvider : ILoggerProvider
{
    private readonly List<TestLogEntry> entries = [];

    public IReadOnlyList<TestLogEntry> Entries => entries.ToList();

    public ILogger CreateLogger(string categoryName)
    {
        return new TestLogger(categoryName, entries);
    }

    public void Clear()
    {
        entries.Clear();
    }

    public void Dispose()
    {
    }

    private class TestLogger(string category, List<TestLogEntry> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Error;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            entries.Add(new TestLogEntry(
                category,
                logLevel,
                formatter(state, exception),
                exception));
        }
    }
}
