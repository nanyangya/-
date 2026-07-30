<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, computed } from "vue";
import request from "../../utils/request";
import { useAuthStore } from "../../stores/auth";
import { ElMessage } from "element-plus";
import { User, Document, ChatDotRound, Star } from "@element-plus/icons-vue";
import * as echarts from "echarts";

const authStore = useAuthStore();
const selectedDate = ref(new Date().toISOString().split("T")[0]);
// 🌟 1. 动态问候语逻辑
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return "凌晨好，夜猫子开发者！";
  if (hour < 12) return "早上好，新的一天充满活力！";
  if (hour < 18) return "下午好，喝杯咖啡休息一下吧！";
  if (hour < 22) return "晚上好，今天过得怎么样？";
  return "夜深了，注意保护头发早点休息哦！";
});
const displayDateText = computed(() => {
  if (!selectedDate.value) return "";
  const [year, month, day] = selectedDate.value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  return `${Number(month)}月${Number(day)}日 ${weekdays[date.getDay()]}`;
});
// 用于展示滚动的动态数字
const displayStats = ref({
  totalUsers: 0,
  totalPosts: 0,
  totalComments: 0,
});

// 🌟 2. 炫酷的数字滚动动画器
const animateNumber = (
  key: keyof typeof displayStats.value,
  target: number,
) => {
  let start = 0;
  const duration = 1000; // 滚动总时间 1秒
  const frames = 30; // 渲染帧数
  const increment = target / frames;
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      displayStats.value[key] = target;
      clearInterval(timer);
    } else {
      displayStats.value[key] = Math.ceil(start);
    }
  }, duration / frames);
};

// 图表实例
const lineChartRef = ref(null);
const pieChartRef = ref(null);
const lineChartInstance = shallowRef<any>(null);
const pieChartInstance = shallowRef<any>(null);

// 初始化折线图
const initLineChart = (trendData: any[]) => {
  if (!lineChartRef.value) return;
  lineChartInstance.value = echarts.init(lineChartRef.value);

  const option = {
    title: {
      text: "活跃度趋势",
      textStyle: { color: "#64748b", fontSize: 15, fontWeight: "normal" },
    },
    tooltip: { trigger: "axis" },
    grid: { left: "2%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trendData.map((item) => item.date),
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
    },
    series: [
      {
        name: "发帖量",
        type: "line",
        smooth: true,
        data: trendData.map((item) => item.count),
        itemStyle: { color: "#3b82f6" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(59, 130, 246, 0.4)" },
            { offset: 1, color: "rgba(59, 130, 246, 0.05)" },
          ]),
        },
      },
    ],
  };
  lineChartInstance.value.setOption(option);
};

// 🌟 3. 初始化环形饼图
const initPieChart = (categoryData: any[]) => {
  if (!pieChartRef.value) return;
  pieChartInstance.value = echarts.init(pieChartRef.value);

  // 映射英文分类为中文
  const map: Record<string, string> = {
    tech: "技术交流",
    job: "求职实习",
    life: "闲聊灌水",
  };
  const formattedData = categoryData.map((item) => ({
    name: map[item.category] || "其他",
    value: item.count,
  }));

  const option = {
    title: {
      text: "内容分布",
      textStyle: { color: "#64748b", fontSize: 15, fontWeight: "normal" },
    },
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: {
      bottom: "0%",
      left: "center",
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
    },
    color: ["#3b82f6", "#10b981", "#fbbf24", "#8b5cf6"], // 主题调色盘
    series: [
      {
        type: "pie",
        radius: ["45%", "75%"], // 设置内半径和外半径，变成甜甜圈环形图
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
        label: { show: false, position: "center" },
        emphasis: {
          label: { show: true, fontSize: 18, fontWeight: "bold" },
        },
        labelLine: { show: false },
        data: formattedData.length
          ? formattedData
          : [{ name: "暂无数据", value: 0 }],
      },
    ],
  };
  pieChartInstance.value.setOption(option);
};

const fetchStats = async () => {
  try {
    // 🌟 发送请求时，带上用户选择的日期
    const res: any = await request.get("/admin/dashboard-stats", {
      params: { date: selectedDate.value },
    });
    if (res.code === 200) {
      animateNumber("totalUsers", res.data.totalUsers);
      animateNumber("totalPosts", res.data.totalPosts);
      animateNumber("totalComments", res.data.totalComments);

      initLineChart(res.data.trendData);
      initPieChart(res.data.categoryData);
    }
  } catch (error) {
    ElMessage.error("获取统计数据失败");
  }
};

const handleResize = () => {
  if (lineChartInstance.value) lineChartInstance.value.resize();
  if (pieChartInstance.value) pieChartInstance.value.resize();
};

onMounted(() => {
  fetchStats();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (lineChartInstance.value) lineChartInstance.value.dispose();
  if (pieChartInstance.value) pieChartInstance.value.dispose();
});
</script>

<template>
  <div class="dashboard-container">
    <!-- 🌟 欢迎区域 -->
    <div class="welcome-banner">
      <div class="greeting-text">
        <h2 class="title">
          {{ greeting }}
          <span>{{ authStore.currentUser?.username || "管理员" }}</span>
        </h2>
        <p class="subtitle">这里是系统数据总览，掌握社区的每一刻跳动。</p>
      </div>

      <!-- 🌟 绝杀：外壳包裹隐身法 -->
      <div class="date-picker-container">
        <!-- 1. 明面上好看的浅蓝色胶囊 -->
        <div class="fake-date-badge">
          <el-icon><Document /></el-icon>
          {{ displayDateText }}
        </div>

        <!-- 2. 套了一层隐形斗篷的真实日期选择器 -->
        <div class="hidden-picker-wrapper">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            @change="fetchStats"
          />
        </div>
      </div>
    </div>

    <!-- 顶部数据卡片 -->
    <el-row :gutter="20" class="data-cards">
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="stat-card hover-up">
          <div class="stat-icon bg-blue">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-title">总用户数</div>
            <div class="stat-value">{{ displayStats.totalUsers }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="stat-card hover-up">
          <div class="stat-icon bg-green">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-title">文章总数</div>
            <div class="stat-value">{{ displayStats.totalPosts }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="stat-card hover-up">
          <div class="stat-icon bg-purple">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-title">全站评论</div>
            <div class="stat-value">{{ displayStats.totalComments }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6" :xs="12">
        <el-card shadow="hover" class="stat-card hover-up">
          <div class="stat-icon bg-orange">
            <el-icon><Star /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-title">系统状态</div>
            <div class="stat-value text-success">正常运行</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 🌟 双图表大屏展示 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 左侧：折线图 -->
      <el-col :span="16" :xs="24">
        <el-card shadow="never" class="chart-card">
          <div ref="lineChartRef" class="echarts-container"></div>
        </el-card>
      </el-col>

      <!-- 右侧：新增的环形饼图 -->
      <el-col :span="8" :xs="24">
        <el-card shadow="never" class="chart-card">
          <div ref="pieChartRef" class="echarts-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 0;
}

/* 欢迎横幅 */
.welcome-banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  background: var(--el-bg-color-overlay);
  padding: 24px 30px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}
.greeting-text .title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.greeting-text .title span {
  color: var(--el-color-primary); /* 用户名高亮 */
}
.greeting-text .subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* ================= 🌟 障眼法日期选择器终极样式 ================= */
.date-picker-container {
  position: relative;
  display: inline-block;
}

/* 完美还原截图里的浅蓝胶囊（文字和图标都是蓝色） */
.fake-date-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--el-color-primary-light-9);
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary); /* 文字变成主题蓝 */
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--el-color-primary-light-8);
}

.fake-date-badge:hover {
  background: var(--el-color-primary-light-8);
}

/* 隐形斗篷：绝对定位，盖在胶囊正上方，完全透明 */
.hidden-picker-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0; /* 核心：0透明度 */
  z-index: 10;
  cursor: pointer;
}

/* 强迫斗篷里的原生组件必须填满空间，且鼠标变成小手 */
.hidden-picker-wrapper :deep(.el-date-editor),
.hidden-picker-wrapper :deep(.el-input__wrapper),
.hidden-picker-wrapper :deep(.el-input__inner) {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
}

/* 顶部卡片 */
.data-cards {
  margin-bottom: 24px;
}
.stat-card {
  border: none;
  border-radius: 16px;
  background-color: var(--el-bg-color-overlay);
  padding: 10px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.hover-up:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
}
:deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}
.bg-blue {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
}
.bg-green {
  background: linear-gradient(135deg, #34d399, #10b981);
}
.bg-purple {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
}
.bg-orange {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.stat-info {
  flex: 1;
}
.stat-title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--el-text-color-primary);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; /* 数字更好看 */
}
.text-success {
  color: #10b981;
  font-size: 18px;
  font-weight: bold;
}

/* 图表容器 */
.chart-card {
  border: none;
  border-radius: 16px;
  background-color: var(--el-bg-color-overlay);
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}
.echarts-container {
  width: 100%;
  height: 380px;
}

@media (max-width: 768px) {
  .welcome-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 18px 16px;
    border-radius: 16px;
  }

  .greeting-text .title {
    font-size: 18px;
  }

  .greeting-text .subtitle {
    font-size: 13px;
  }

  .data-cards {
    margin-bottom: 16px;
  }

  .stat-card {
    margin-bottom: 12px;
    padding: 6px;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
    border-radius: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .chart-card {
    padding: 12px;
    margin-bottom: 12px;
  }

  .echarts-container {
    height: 260px;
  }
}
</style>
