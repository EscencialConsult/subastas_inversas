namespace SICST.Application.Common.Security;

public static class PermissionCodes
{
    public const string CompaniesRead = "companies:read";
    public const string CompaniesCreate = "companies:create";
    public const string CompaniesUpdate = "companies:update";
    public const string ConfigurationRead = "configuration:read";
    public const string ConfigurationManage = "configuration:manage";
    public const string UsersManage = "users:manage";
    public const string SuppliersManage = "suppliers:manage";
    public const string PurchasesManage = "purchases:manage";
    public const string PurchasesApprove = "purchases:approve";
    public const string PurchasesEvaluate = "purchases:evaluate";
    public const string AuditRead = "audit:read";
}
