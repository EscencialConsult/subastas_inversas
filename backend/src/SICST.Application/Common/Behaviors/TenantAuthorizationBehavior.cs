using MediatR;
using SICST.Application.Common.Exceptions;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Common.Behaviors;

public class TenantAuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ICurrentTenant _currentTenant;

    public TenantAuthorizationBehavior(ICurrentTenant currentTenant)
    {
        _currentTenant = currentTenant;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (request is ITenantRequest<TResponse> tenantRequest)
        {
            if (_currentTenant.CompanyId.HasValue && _currentTenant.CompanyId.Value != tenantRequest.CompanyId)
            {
                throw new ForbiddenAccessException();
            }
        }

        return await next();
    }
}
