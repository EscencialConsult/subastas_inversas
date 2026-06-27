using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuctionConfigFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses");

            migrationBuilder.AlterColumn<string>(
                name: "EvaluationActSignature",
                table: "PurchaseProcesses",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EvaluationActHash",
                table: "PurchaseProcesses",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPab",
                table: "Bids",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "AutoExtensionMinutes",
                table: "Auctions",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<decimal>(
                name: "PabThreshold",
                table: "Auctions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses",
                column: "EvaluationActSignedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses");

            migrationBuilder.DropColumn(
                name: "IsPab",
                table: "Bids");

            migrationBuilder.DropColumn(
                name: "AutoExtensionMinutes",
                table: "Auctions");

            migrationBuilder.DropColumn(
                name: "PabThreshold",
                table: "Auctions");

            migrationBuilder.AlterColumn<string>(
                name: "EvaluationActSignature",
                table: "PurchaseProcesses",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EvaluationActHash",
                table: "PurchaseProcesses",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseProcesses_Users_EvaluationActSignedById",
                table: "PurchaseProcesses",
                column: "EvaluationActSignedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
