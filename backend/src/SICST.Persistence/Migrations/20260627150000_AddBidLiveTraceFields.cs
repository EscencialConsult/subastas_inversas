using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SICST.Persistence.Contexts;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260627150000_AddBidLiveTraceFields")]
    public partial class AddBidLiveTraceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SequenceNumber",
                table: "Bids",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PreviousHash",
                table: "Bids",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.AddColumn<string>(
                name: "Hash",
                table: "Bids",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: string.Empty);

            migrationBuilder.Sql("""
                UPDATE "Bids" AS b
                SET "SequenceNumber" = ranked."SequenceNumber"
                FROM (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "AuctionId" ORDER BY "PlacedAtUtc", "Id") AS "SequenceNumber"
                    FROM "Bids"
                ) AS ranked
                WHERE b."Id" = ranked."Id";
                """);

            migrationBuilder.Sql("""
                UPDATE "Bids"
                SET "Hash" = repeat(md5(
                    "AuctionId"::text || '|' ||
                    "Id"::text || '|' ||
                    "SupplierId"::text || '|' ||
                    "Amount"::text || '|' ||
                    "PlacedAtUtc"::text || '|' ||
                    "SequenceNumber"::text || '|'
                ), 2)
                WHERE "Hash" = '';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Bids_AuctionId_SequenceNumber",
                table: "Bids",
                columns: new[] { "AuctionId", "SequenceNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bids_AuctionId_SequenceNumber",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "SequenceNumber",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "PreviousHash",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "Hash",
                table: "Bids");
        }
    }
}
