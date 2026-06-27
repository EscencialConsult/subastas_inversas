using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SICST.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEvaluationCriteria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EvaluationCriteria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseProcessId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Weight = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EvaluationCriteria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EvaluationCriteria_PurchaseProcesses_PurchaseProcessId",
                        column: x => x.PurchaseProcessId,
                        principalTable: "PurchaseProcesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EvaluationCriteria_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierEvaluations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseProcessId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    TotalWeightedScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    IsExcluded = table.Column<bool>(type: "boolean", nullable: false),
                    ExcludedReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    EvaluatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    EvaluatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierEvaluations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierEvaluations_PurchaseProcesses_PurchaseProcessId",
                        column: x => x.PurchaseProcessId,
                        principalTable: "PurchaseProcesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SupplierEvaluations_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierEvaluations_Users_EvaluatedById",
                        column: x => x.EvaluatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierCriterionResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierEvaluationId = table.Column<Guid>(type: "uuid", nullable: false),
                    EvaluationCriterionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    Passed = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierCriterionResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierCriterionResults_EvaluationCriteria_EvaluationCrite~",
                        column: x => x.EvaluationCriterionId,
                        principalTable: "EvaluationCriteria",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierCriterionResults_SupplierEvaluations_SupplierEvalua~",
                        column: x => x.SupplierEvaluationId,
                        principalTable: "SupplierEvaluations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationCriteria_CreatedById",
                table: "EvaluationCriteria",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationCriteria_PurchaseProcessId_Name",
                table: "EvaluationCriteria",
                columns: new[] { "PurchaseProcessId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierCriterionResults_EvaluationCriterionId",
                table: "SupplierCriterionResults",
                column: "EvaluationCriterionId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierCriterionResults_SupplierEvaluationId_EvaluationCri~",
                table: "SupplierCriterionResults",
                columns: new[] { "SupplierEvaluationId", "EvaluationCriterionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierEvaluations_EvaluatedById",
                table: "SupplierEvaluations",
                column: "EvaluatedById");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierEvaluations_PurchaseProcessId_SupplierId",
                table: "SupplierEvaluations",
                columns: new[] { "PurchaseProcessId", "SupplierId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierEvaluations_SupplierId",
                table: "SupplierEvaluations",
                column: "SupplierId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupplierCriterionResults");

            migrationBuilder.DropTable(
                name: "EvaluationCriteria");

            migrationBuilder.DropTable(
                name: "SupplierEvaluations");
        }
    }
}
