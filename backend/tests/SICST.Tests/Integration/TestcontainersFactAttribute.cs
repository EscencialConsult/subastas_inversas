namespace SICST.Tests.Integration;

public sealed class TestcontainersFactAttribute : FactAttribute
{
    public TestcontainersFactAttribute()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("SICST_RUN_TESTCONTAINERS"),
                "true",
                StringComparison.OrdinalIgnoreCase))
        {
            Skip = "Set SICST_RUN_TESTCONTAINERS=true and start Docker to run PostgreSQL Testcontainers integration tests.";
        }
    }
}
