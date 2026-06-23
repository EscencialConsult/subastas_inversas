namespace SICST.Domain.Entities;

public class RolePermission
{
    public Guid Id { get; set; }

    public UserRole Role { get; set; }

    public Guid PermissionId { get; set; }

    public Permission Permission { get; set; } = null!;
}
