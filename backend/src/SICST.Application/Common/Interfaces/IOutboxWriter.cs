using SICST.Application.Common.Events;

namespace SICST.Application.Common.Interfaces;

public interface IOutboxWriter
{
    void Add(IApplicationEvent applicationEvent);
}
