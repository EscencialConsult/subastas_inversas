using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditAppendOnlyTrigger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION prevent_audit_events_update_delete()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    RAISE EXCEPTION 'AuditEvents is append-only. UPDATE and DELETE are not allowed.';
                END;
                $$;
                """);

            migrationBuilder.Sql(
                """
                DROP TRIGGER IF EXISTS trg_audit_events_append_only ON "AuditEvents";

                CREATE TRIGGER trg_audit_events_append_only
                BEFORE UPDATE OR DELETE ON "AuditEvents"
                FOR EACH ROW
                EXECUTE FUNCTION prevent_audit_events_update_delete();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""DROP TRIGGER IF EXISTS trg_audit_events_append_only ON "AuditEvents";""");

            migrationBuilder.Sql("""DROP FUNCTION IF EXISTS prevent_audit_events_update_delete();""");
        }
    }
}
