### 1. 编写 `TRAE_RULES.md`
根据您的最终调整，规则文件将包含：

*   **项目背景**: 
    *   专注于 "陪你" App 的 MVP 版本开发。
*   **开发原则**: 
    *   **文档为本，勇于建议**: 开发遇阻先查 `docs/`，但若有更优解（如性能、架构层面），请务必提出供您判断。
    *   **语言规范**: 文档、注释、Commit Message **主要/尽可能使用中文**。代码中的变量、函数名保持标准的英文命名。
*   **技术规范**:
    *   **数据库**: 强制使用 **Drizzle ORM**（需重构现有 Raw SQL）。
    *   **架构**: Monorepo (Server/Client 分离)，Express + React。

### 2. 清理文件
删除根目录下的：
*   `CONFLICTS_ANALYSIS.md`
*   `DELIVERY_REPORT.md`
*   `FINAL_DELIVERY_REPORT.md`
*   `INTEGRATION_PROGRESS.md`
*   `design_comparison.md`
*   `ui_fix_result.md`
*   `ui_issues.md`
*   `todo.md`

准备执行。