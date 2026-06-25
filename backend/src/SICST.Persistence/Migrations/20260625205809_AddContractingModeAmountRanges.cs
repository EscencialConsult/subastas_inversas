using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractingModeAmountRanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MaxAmount",
                table: "ContractingModes",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MinAmount",
                table: "ContractingModes",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_ContractingModes_CompanyId_MinAmount_MaxAmount",
                table: "ContractingModes",
                columns: new[] { "CompanyId", "MinAmount", "MaxAmount" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContractingModes_CompanyId_MinAmount_MaxAmount",
                table: "ContractingModes");

            migrationBuilder.DropColumn(
                name: "MaxAmount",
                table: "ContractingModes");

            migrationBuilder.DropColumn(
                name: "MinAmount",
                table: "ContractingModes");
        }
    }
}
