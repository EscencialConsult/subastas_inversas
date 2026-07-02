using SICST.Application.Common.Interfaces;

namespace SICST.Application.Common.Events;

public sealed class NullOutboxWriter : IOutboxWriter
{
    public static readonly NullOutboxWriter Instance = new();

    private NullOutboxWriter()
    {
    }

    public void Add(IApplicationEvent applicationEvent)
    {
    }
}
