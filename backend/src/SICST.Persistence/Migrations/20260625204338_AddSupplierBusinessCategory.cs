using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierBusinessCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessCategory",
                table: "Suppliers",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "Sin informar");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_BusinessCategory",
                table: "Suppliers",
                column: "BusinessCategory");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Province_Locality",
                table: "Suppliers",
                columns: new[] { "Province", "Locality" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Suppliers_BusinessCategory",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_Province_Locality",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "BusinessCategory",
                table: "Suppliers");
        }
    }
}
