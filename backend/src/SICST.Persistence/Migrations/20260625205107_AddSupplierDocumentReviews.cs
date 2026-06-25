using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierDocumentReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SupplierDocumentReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierDocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: false),
                    Verdict = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ExceptionReason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierDocumentReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierDocumentReviews_SupplierDocuments_SupplierDocumentId",
                        column: x => x.SupplierDocumentId,
                        principalTable: "SupplierDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SupplierDocumentReviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocumentReviews_ReviewerId",
                table: "SupplierDocumentReviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocumentReviews_SupplierDocumentId",
                table: "SupplierDocumentReviews",
                column: "SupplierDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierDocumentReviews_SupplierDocumentId_Action",
                table: "SupplierDocumentReviews",
                columns: new[] { "SupplierDocumentId", "Action" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupplierDocumentReviews");
        }
    }
}
