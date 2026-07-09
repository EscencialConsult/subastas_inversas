using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddArcaSupplierFiscalData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArcaBusinessName",
                table: "Suppliers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ArcaEmployeeCount",
                table: "Suppliers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaFiscalAddress",
                table: "Suppliers",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaFiscalCity",
                table: "Suppliers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaFiscalProvince",
                table: "Suppliers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaIvaCondition",
                table: "Suppliers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ArcaIvaConditionId",
                table: "Suppliers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaMonotributoCategory",
                table: "Suppliers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaPersonType",
                table: "Suppliers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArcaRawData",
                table: "Suppliers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArcaBusinessName",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaEmployeeCount",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaFiscalAddress",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaFiscalCity",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaFiscalProvince",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaIvaCondition",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaIvaConditionId",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaMonotributoCategory",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaPersonType",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "ArcaRawData",
                table: "Suppliers");
        }
    }
}
