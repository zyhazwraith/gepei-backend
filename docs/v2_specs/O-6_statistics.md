# O-6 统计报表 (Statistics)

## 1. 概述
为管理员提供业务数据的可视化概览，包含客服业绩统计和平台资金收支统计。

## 2. 核心需求
*   **权限**: 仅 Admin 和 CS 可见 (部分敏感数据可能仅 Admin 可见，但目前 MVP 阶段两者皆可)。
*   **数据范围**: 支持按时间范围筛选 (Today, Week, Month, Year, All)。

## 3. API 设计

### 3.1 获取客服业绩 (CS Performance)
统计每个客服创建且已结算的定制单情况（列表展示）。

*   **Endpoint**: `GET /api/v1/admin/stats/cs-performance`
*   **Query Params**:
    *   `timeRange`: 时间范围枚举值 (必填)
        *   `today`: 今天 (00:00 - 23:59)
        *   `week`: 本周 (周一 00:00 - 周日 23:59)
        *   `month`: 本月 (1日 00:00 - 月末 23:59) [默认]
        *   `year`: 本年 (1月1日 00:00 - 12月31日 23:59)
        *   `all`: 全部时间 (自项目启动以来)
    *   `startDate`: ISO Date String (可选, 自定义范围开始)
    *   `endDate`: ISO Date String (可选, 自定义范围结束)
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "list": [
          {
            "csId": 101,
            "csName": "客服小美",
            "orderCount": 15,    // 已结算单量 (核心指标)
            "totalAmount": 1500000 // 结算总金额 (单位: 分, 辅助参考)
          },
          {
            "csId": 102,
            "csName": "客服阿强",
            "orderCount": 12,
            "totalAmount": 1200000
          }
        ]
      }
    }
    ```
*   **Logic**:
    *   **Filter**: `orders.type` = 'custom' AND `orders.creator_id` IS NOT NULL AND `orders.status` = 'completed'.
    *   **Time Basis**: `orders.actual_end_time` (订单服务实际结束时间) 在筛选范围内。
    *   **Group By**: `orders.creator_id`.

### 3.2 获取平台收支 (Platform Finance)
统计平台总流水。

*   **Endpoint**: `GET /api/v1/admin/stats/platform-finance`
*   **Query Params**: 同上
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "summary": {
          "totalIncome": 5000000, // 分 (前端需转换为元展示)
          "totalWithdraw": 3000000 // 分
        },
        "chartData": [
          { 
            "date": "2023-10-01", 
            "income": 150000, 
            "withdraw": 50000 
          }
        ]
      }
    }
    ```
*   **Logic**:
    *   **Income**: 
        *   Sum `orders.amount` (where status in ['completed', 'service_ended'] AND `actual_end_time` in range).
        *   Sum `overtime_records.fee` (where status='paid' AND `created_at` in range - 加时通常即时生效，暂用创建时间或关联订单的结束时间). *修正: 简化起见，收入统计统一统一使用订单的 `actual_end_time` 作为归档点，加时费随主订单一起统计。*
    *   **Withdraw**: 
        *   Sum `withdrawals.amount` (where status='completed' AND `processed_at` in range).

## 4. 前端展示要求
1.  **客服数据**: 使用表格展示 (Table)，不叫排行榜。
2.  **平台数据**:
    *   金额单位: **元 (¥)**。
    *   图表类型: **折线图 (Linear Line Chart)**，点对点直线连接。
    *   **提示说明**: 增加 Tooltip 解释统计时间点。
        *   收入统计点: 订单服务结束时间。
        *   提现统计点: 提现审批通过时间。
