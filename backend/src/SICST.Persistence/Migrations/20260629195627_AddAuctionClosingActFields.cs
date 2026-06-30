using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuctionClosingActFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentHash",
                table: "Awards",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ImmutableHash",
                table: "Awards",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ClosingActHash",
                table: "Auctions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosingActPath",
                table: "Auctions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SavingsAmount",
                table: "Auctions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SavingsPercentage",
                table: "Auctions",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentHash",
                table: "Awards");

            migrationBuilder.DropColumn(
                name: "ImmutableHash",
                table: "Awards");

            migrationBuilder.DropColumn(
                name: "ClosingActHash",
                table: "Auctions");

            migrationBuilder.DropColumn(
                name: "ClosingActPath",
                table: "Auctions");

            migrationBuilder.DropColumn(
                name: "SavingsAmount",
                table: "Auctions");

            migrationBuilder.DropColumn(
                name: "SavingsPercentage",
                table: "Auctions");
        }
    }
}
