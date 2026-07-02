using MediatR;

namespace SICST.Application.Common.Interfaces;

public interface ITenantRequest<out TResponse> : IRequest<TResponse>
{
    Guid CompanyId { get; }
}
