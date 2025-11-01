const THAI_MONTHS = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const API_BASE_URL = "https://learningportal.ocsc.go.th/learningspaceapi";
const DEFAULT_LOADING_TEXT = "กำลังโหลดข้อมูล...";
const REPORT5_API_TEMPLATE = "https://learningportal.ocsc.go.th/learningspaceapi/reports/5?lastdate=2025-01-01";

if (window.Chart && Chart.defaults && !Chart.defaults.global) {
    Chart.defaults.global = Chart.defaults;
}

export function formatBuddhistDate(date) {
    if (!(date instanceof Date)) return "";
    const day = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

function formatChristianDate(date) {
    return date.toISOString().split("T")[0];
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <div class="toast-content">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

function showError(message, details = "") {
    const errorMessage = document.getElementById("error-message");
    if (!errorMessage) return;

    const content = document.getElementById("error-content");
    const detail = document.getElementById("error-details");

    if (content) content.textContent = message;
    if (detail) detail.textContent = details;
    errorMessage.classList.add("show");
}

function hideError() {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
        errorMessage.classList.remove("show");
    }
}

function showLoading() {
    const loading = document.getElementById("loading");
    const results = document.getElementById("results-container");
    if (loading) loading.classList.add("show");
    if (results) results.classList.remove("show");
}

function hideLoading(showResults = false) {
    const loading = document.getElementById("loading");
    const results = document.getElementById("results-container");
    if (loading) loading.classList.remove("show");
    if (showResults && results) {
        results.classList.add("show");
    }
}

function renderLoadingRow(tableBody, colspan) {
    if (!tableBody) return;
    tableBody.innerHTML = `
        <tr>
            <td colspan="${colspan}" style="text-align: center; color: #667eea;">
                <div class="loading-spinner-small"></div>
                ${DEFAULT_LOADING_TEXT}
            </td>
        </tr>
    `;
}

function destroyChart(chartInstance) {
    if (chartInstance) {
        chartInstance.destroy();
    }
    return null;
}

export function setupThaiDatePicker(selector, onChangeCallback, defaultDate = "today") {
    const convertToBuddhistYear = (instance) => {
        setTimeout(() => {
            const yearInputs = instance.calendarContainer.querySelectorAll(".cur-year");
            yearInputs.forEach((el) => {
                const year = parseInt(el.value || el.textContent, 10);
                if (!isNaN(year) && year < 2500) {
                    const buddhistYear = year + 543;
                    if (el.tagName === "INPUT") {
                        el.value = buddhistYear;
                    } else {
                        el.textContent = buddhistYear;
                    }
                }
            });
        }, 5);
    };

    const overrideDisplayedDate = (instance) => {
        if (instance.selectedDates.length > 0) {
            const date = instance.selectedDates[0];
            instance.input.value = formatBuddhistDate(date);
        }
    };

    return flatpickr(selector, {
        locale: "th",
        dateFormat: "d M Y",
        defaultDate,
        onReady: (selectedDates, _dateStr, instance) => {
            convertToBuddhistYear(instance);
            overrideDisplayedDate(instance);
            if (selectedDates.length > 0) {
                const date = selectedDates[0];
                instance.input.dataset.isoDate = formatChristianDate(date);
            }
        },
        onOpen: (_selectedDates, _dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onMonthChange: (_selectedDates, _dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onYearChange: (_selectedDates, _dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onChange: (selectedDates, _dateStr, instance) => {
            if (selectedDates.length === 0) return;
            const selectedDate = selectedDates[0];
            selectedDate.setHours(12, 0, 0, 0);
            instance.input.dataset.isoDate = formatChristianDate(selectedDate);
            instance.input.value = formatBuddhistDate(selectedDate);
            convertToBuddhistYear(instance);
            if (onChangeCallback) {
                onChangeCallback(selectedDate);
            }
        },
        onClose: (_selectedDates, _dateStr, instance) => {
            overrideDisplayedDate(instance);
        }
    });
}

export function setDefaultThaiDate(selector, date = new Date()) {
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);

    const input = document.querySelector(selector);
    if (input) {
        input.value = formatBuddhistDate(targetDate);
        input.dataset.isoDate = formatChristianDate(targetDate);
    }
    return targetDate;
}

class BaseReport {
    constructor(config) {
        this.config = config;
        this.chartInstance = null;
        this.currentData = null;
    }

    getElement(selector) {
        if (!selector) return null;
        return document.querySelector(selector);
    }

    get tableBody() {
        return this.getElement(this.config.tableBodySelector);
    }

    get chartContext() {
        const canvasId = this.config.chartElementId;
        if (!canvasId) return null;
        const canvas = document.getElementById(canvasId);
        return canvas && canvas.getContext ? canvas.getContext("2d") : null;
    }

    get loadingColspan() {
        return this.config.loadingColspan ?? 3;
    }

    clearTable() {
        const body = this.tableBody;
        if (body) {
            body.innerHTML = "";
        }
    }

    renderLoadingState() {
        const body = this.tableBody;
        if (body) {
            renderLoadingRow(body, this.loadingColspan);
        }
    }

    destroyExistingChart() {
        this.chartInstance = destroyChart(this.chartInstance);
    }

    updateReportTitle(title) {
        const el = this.getElement(this.config.reportTitleSelector);
        if (el && title) {
            const icon = this.config.titleIcon;
            el.innerHTML = icon ? `<i class="${icon}"></i> ${title}` : title;
        }
    }

    onAfterRender(_data) {}
}

class SingleDateReport extends BaseReport {
    constructor(config) {
        super(config);
        this.selectedDate = null;
        this.init();
    }

    init() {
        const {
            dateInputSelector,
            defaultDateProvider,
            submitButtonSelector,
            exportButtonSelector,
            autoSubmitOnChange
        } = this.config;

        setupThaiDatePicker(dateInputSelector, (date) => {
            this.selectedDate = date;
            this.updateCurrentDateLabel(date);
            if (autoSubmitOnChange) {
                this.generateReport();
            }
        });

        const defaultDate = defaultDateProvider ? defaultDateProvider() : new Date();
        this.selectedDate = setDefaultThaiDate(dateInputSelector, defaultDate);
        this.updateCurrentDateLabel(this.selectedDate);

        const submitBtn = this.getElement(submitButtonSelector);
        if (submitBtn) {
            submitBtn.addEventListener("click", () => this.generateReport());
        }

        const exportBtn = this.getElement(exportButtonSelector);
        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                if (!this.currentData) {
                    showToast("ไม่มีข้อมูลสำหรับส่งออก");
                    return;
                }
                this.exportToExcel();
            });
        }

        this.afterInit();

        if (this.config.autoSubmitOnLoad) {
            this.generateReport();
        }
    }

    afterInit() {}

    updateCurrentDateLabel(date) {
        const label = this.getElement(this.config.currentDateLabelSelector);
        if (!label || !date) return;

        const formatter = this.config.currentDateLabelFormatter ||
            ((value) => `ข้อมูล ณ วันที่ ${formatBuddhistDate(value)}`);

        label.textContent = formatter(date);
    }

    getIsoDate() {
        if (this.selectedDate) {
            return formatChristianDate(this.selectedDate);
        }
        const input = this.getElement(this.config.dateInputSelector);
        return input?.dataset.isoDate;
    }

    translateError(error) {
        return {
            toast: `เกิดข้อผิดพลาด: ${error.message}`,
            details: this.config.genericErrorDetail || "ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่ภายหลัง"
        };
    }

    async generateReport() {
        const isoDate = this.getIsoDate();
        if (!isoDate) {
            showToast(this.config.missingDateMessage || "กรุณาเลือกวันที่");
            return;
        }

        hideError();
        showLoading();
        this.clearTable();
        this.renderLoadingState();
        this.destroyExistingChart();

        try {
            const data = await this.fetchData(isoDate);
            this.currentData = data;

            this.clearTable();
            this.renderTable(data);
            this.renderChart(data);
            this.updateReportTitle(data?.title);
            this.updateCurrentDateLabel(this.selectedDate || new Date(isoDate));
            hideLoading(true);
            this.onAfterRender(data);
        } catch (error) {
            console.error("Error:", error);
            this.clearTable();
            const { toast, details } = this.translateError(error);
            if (toast) {
                showToast(toast);
            }
            showError(toast || "เกิดข้อผิดพลาด", details || "");
            hideLoading();
        }
    }

    // To be implemented by subclasses.
    fetchData() {
        throw new Error("fetchData must be implemented.");
    }

    renderTable() {}
    renderChart() {}
    exportToExcel() {}
}

class MemberReport extends SingleDateReport {
    constructor(options = {}) {
        const autoSubmitOnLoad = options.autoSubmitOnLoad ?? true;
        const autoSubmitOnChange = options.autoSubmitOnChange ?? false;
        super({
            dateInputSelector: "#report-date",
            currentDateLabelSelector: "#current-date",
            reportTitleSelector: "#report-title",
            tableBodySelector: "#table-body",
            chartElementId: "members-chart",
            submitButtonSelector: "#submit-btn",
            exportButtonSelector: "#export-btn",
            autoSubmitOnLoad: false,
            autoSubmitOnChange,
            defaultDateProvider: options.defaultDateProvider,
            titleIcon: "fas fa-users",
            loadingColspan: 3,
            currentDateLabelFormatter: (date) => `ข้อมูล ณ วันที่ ${formatBuddhistDate(date)}`,
            genericErrorDetail: "ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบวันที่หรือลองใหม่ภายหลัง"
        });
        this.apiTemplate = options.apiTemplate ?? `${API_BASE_URL}/reports/1?lastdate=`;
        this.exportFileName = options.exportFileName ?? "member-report.xlsx";
        if (autoSubmitOnLoad) {
            this.generateReport();
        }
    }

    buildApiUrl(isoDate) {
        if (this.apiTemplate.includes("2025-01-01")) {
            return this.apiTemplate.replace("2025-01-01", isoDate);
        }
        if (this.apiTemplate.includes("{lastdate}")) {
            return this.apiTemplate.replace("{lastdate}", isoDate);
        }
        if (this.apiTemplate.endsWith("lastdate=") || this.apiTemplate.endsWith("=")) {
            return `${this.apiTemplate}${isoDate}`;
        }
        const separator = this.apiTemplate.includes("?") ? "&" : "?";
        return `${this.apiTemplate}${separator}lastdate=${isoDate}`;
    }

    async fetchData(isoDate) {
        const apiUrl = this.buildApiUrl(isoDate);
        const response = await axios.get(apiUrl);

        if (response.status === 404) {
            throw new Error("404 Not Found - ไม่พบข้อมูล");
        } else if (response.status === 500) {
            throw new Error("500 Internal Server Error - ข้อผิดพลาดเซิร์ฟเวอร์");
        } else if (response.status === 408) {
            throw new Error("408 Request Timeout - การร้องขอหมดเวลา");
        } else if (response.status !== 200) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const data = response.data;
        if (!data || !Array.isArray(data.x) || !Array.isArray(data.y)) {
            throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
        }

        return {
            title: data.title,
            categories: data.x,
            counts: data.y
        };
    }

    translateError(error) {
        let errorDetails = "ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบวันที่หรือลองใหม่ภายหลัง";
        if (error.message.includes("500")) {
            errorDetails = "เซิร์ฟเวอร์ประสบปัญหาภายใน กรุณาลองใหม่ในภายหลัง";
        } else if (error.message.includes("408")) {
            errorDetails = "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่หรือตรวจสอบเครือข่ายของคุณ";
        }

        return {
            toast: `เกิดข้อผิดพลาด: ${error.message}`,
            details: errorDetails
        };
    }

    renderTable(data) {
        const tableBody = this.tableBody;
        if (!tableBody) return;

        if (!data || !Array.isArray(data.counts) || !Array.isArray(data.categories)) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td></tr>`;
            return;
        }

        const total = data.counts.reduce((sum, count) => sum + count, 0);
        const rawPercentages = data.counts.map((count) => (total > 0 ? (count / total) * 100 : 0));
        const roundedPercentages = rawPercentages.map((p) => Math.round(p * 100) / 100);
        let percentageSum = roundedPercentages.reduce((a, b) => a + b, 0);
        const adjustment = Math.round((100 - percentageSum) * 100) / 100;
        if (roundedPercentages.length > 0) {
            roundedPercentages[roundedPercentages.length - 1] += adjustment;
        }

        tableBody.innerHTML = "";
        data.categories.forEach((category, index) => {
            const count = data.counts[index] || 0;
            const percentage = (roundedPercentages[index] ?? 0).toFixed(2);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${category || "ไม่มีชื่อประเภท"}</td>
                <td>${count.toLocaleString()}</td>
                <td>${percentage}%</td>
            `;
            tableBody.appendChild(row);
        });

        const totalRow = document.createElement("tr");
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f7fafc";
        totalRow.innerHTML = `
            <td>รวมทั้งหมด</td>
            <td>${total.toLocaleString()}</td>
            <td>100.00%</td>
        `;
        tableBody.appendChild(totalRow);

        this.currentData = {
            ...data,
            total
        };
    }

    renderChart(data) {
        const ctx = this.chartContext;
        if (!ctx || !data || !Array.isArray(data.counts) || !Array.isArray(data.categories)) {
            return;
        }

        const colors = ["#003f5c", "#58508d", "#bc5090", "#ff6361", "#ffa600"];

        this.chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: data.categories,
                datasets: [{
                    data: data.counts,
                    backgroundColor: colors,
                    borderColor: "#ffffff",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            padding: 15,
                            font: { size: 12 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(2) : "0.00";
                                return `${context.label}: ${context.raw.toLocaleString()} คน (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: "60%"
            }
        });
    }

    exportToExcel() {
        if (!this.currentData) {
            return;
        }

        const excelData = [
            ["ประเภทสมาชิก", "จำนวน (คน)", "เปอร์เซ็นต์ (%)"]
        ];

        const total = this.currentData.total ?? 0;
        const rawPercentages = this.currentData.counts.map((count) => (total > 0 ? (count / total) * 100 : 0));
        const roundedPercentages = rawPercentages.map((p) => Math.round(p * 100) / 100);
        let percentageSum = roundedPercentages.reduce((a, b) => a + b, 0);
        const adjustment = Math.round((100 - percentageSum) * 100) / 100;
        if (roundedPercentages.length > 0) {
            roundedPercentages[roundedPercentages.length - 1] += adjustment;
        }

        this.currentData.categories.forEach((category, index) => {
            const count = this.currentData.counts[index] || 0;
            const percentage = (roundedPercentages[index] ?? 0).toFixed(2);
            excelData.push([category || "ไม่มีชื่อประเภท", count, `${percentage}%`]);
        });

        excelData.push(["รวมทั้งหมด", total, "100.00%"]);
        excelData.push([]);
        const labelDate = this.selectedDate || new Date();
        excelData.push([`ข้อมูล ณ วันที่ ${formatBuddhistDate(labelDate)}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานสมาชิก");
        XLSX.writeFile(wb, this.exportFileName);
    }
}

class ActiveUsersReport extends MemberReport {
    constructor() {
        super({
            apiTemplate: REPORT5_API_TEMPLATE,
            defaultDateProvider: () => {
                const date = new Date();
                date.setDate(date.getDate() - 365);
                return date;
            },
            autoSubmitOnLoad: true,
            exportFileName: "active-users-report.xlsx"
        });
    }
}

class DateRangeReport extends BaseReport {
    constructor(config) {
        super(config);
        this.startDate = null;
        this.endDate = null;
        this.init();
    }

    get loadingColspan() {
        return this.config.loadingColspan ?? 4;
    }

    init() {
        const {
            startDateSelector,
            endDateSelector,
            defaultStartDateProvider,
            defaultEndDateProvider,
            submitButtonSelector,
            exportButtonSelector
        } = this.config;

        setupThaiDatePicker(startDateSelector, (date) => {
            this.startDate = date;
            this.updateDateRangeLabel();
        });

        setupThaiDatePicker(endDateSelector, (date) => {
            this.endDate = date;
            this.updateDateRangeLabel();
        });

        const defaultStart = defaultStartDateProvider ? defaultStartDateProvider() : new Date();
        const defaultEnd = defaultEndDateProvider ? defaultEndDateProvider() : new Date();

        this.startDate = setDefaultThaiDate(startDateSelector, defaultStart);
        this.endDate = setDefaultThaiDate(endDateSelector, defaultEnd);
        this.updateDateRangeLabel();

        const submitBtn = this.getElement(submitButtonSelector);
        if (submitBtn) {
            submitBtn.addEventListener("click", () => this.generateReport());
        }

        const exportBtn = this.getElement(exportButtonSelector);
        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                if (!this.currentData) {
                    showToast("ไม่มีข้อมูลสำหรับส่งออก");
                    return;
                }
                this.exportToExcel();
            });
        }

        this.afterInit();

        if (this.config.autoSubmitOnLoad) {
            this.generateReport();
        }
    }

    afterInit() {}

    updateDateRangeLabel() {
        const label = this.getElement(this.config.currentDateRangeLabelSelector);
        if (!label || !this.startDate || !this.endDate) return;

        const formatter = this.config.currentDateRangeFormatter ||
            ((start, end) => `ข้อมูลระหว่างวันที่ ${formatBuddhistDate(start)} ถึง ${formatBuddhistDate(end)}`);

        label.textContent = formatter(this.startDate, this.endDate);
    }

    validateBeforeFetch() {
        if (!this.startDate || !this.endDate) {
            showToast("กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุด");
            return false;
        }
        if (this.startDate > this.endDate) {
            showToast("วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด");
            return false;
        }
        return true;
    }

    translateError(error) {
        return {
            toast: `เกิดข้อผิดพลาด: ${error.message}`,
            details: this.config.genericErrorDetail || "ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่ภายหลัง"
        };
    }

    async generateReport() {
        if (!this.validateBeforeFetch()) {
            return;
        }

        hideError();
        showLoading();
        this.clearTable();
        this.renderLoadingState();
        this.destroyExistingChart();

        try {
            const data = await this.fetchData(this.startDate, this.endDate);
            this.currentData = data;

            this.clearTable();
            this.renderTable(data);
            this.renderChart(data);
            this.updateDateRangeLabel();
            this.updateReportTitle(data?.title);
            if (data?.isEmpty) {
                showToast("ไม่พบข้อมูลในช่วงวันที่ที่เลือก");
            }
            hideLoading(true);
            this.onAfterRender(data);
        } catch (error) {
            console.error("Error:", error);
            this.clearTable();
            const { toast, details } = this.translateError(error);
            if (toast) {
                showToast(toast);
            }
            showError(toast || "เกิดข้อผิดพลาด", details || "");
            hideLoading();
        }
    }

    // To be implemented by subclasses.
    fetchData() {
        throw new Error("fetchData must be implemented.");
    }

    renderTable() {}
    renderChart() {}
    exportToExcel() {}
}

class CourseReportSystem extends DateRangeReport {
    constructor(type = 2) {
        const autoSubmitOnLoad = true;
        super({
            startDateSelector: "#start-date",
            endDateSelector: "#end-date",
            submitButtonSelector: "#submit-btn",
            exportButtonSelector: "#export-btn",
            tableBodySelector: "#table-body",
            chartElementId: "members-chart",
            currentDateRangeLabelSelector: "#current-date-range",
            reportTitleSelector: "#report-title",
            titleIcon: "fas fa-users",
            autoSubmitOnLoad: false,
            loadingColspan: 4,
            genericErrorDetail: "ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบช่วงวันที่หรือลองใหม่ภายหลัง"
        });
        this.type = type;
        this.activeColor = "#FF7F50";
        this.completedColor = "#4682B4";
        if (autoSubmitOnLoad) {
            this.generateReport();
        }
    }

    async fetchData(startDate, endDate) {
        const start = formatChristianDate(startDate);
        const end = formatChristianDate(endDate);
        const apiUrl = `${API_BASE_URL}/reports/${this.type}?startDate=${start}&endDate=${end}`;

        try {
            const response = await axios.get(apiUrl);
            
            if (response.status !== 200) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = response.data;
            if (!data || !Array.isArray(data.x) || !Array.isArray(data.y1) || !Array.isArray(data.y2)) {
                throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
            }

            return {
                title: data.title || (this.type === 2
                    ? "รายงานจำนวนผู้เรียนในแต่ละหลักสูตร"
                    : "รายงานจำนวนผู้เรียนในแต่ละรายวิชา"),
                categories: data.x,
                activeLearners: data.y1,
                completedLearners: data.y2,
                isEmpty: data.x.length === 0
            };
        } catch (error) {
            if (axios.isAxiosError?.(error) && error.response?.status === 404) {
                return {
                    title: "ไม่พบข้อมูลในช่วงวันที่ที่เลือก",
                    categories: [],
                    activeLearners: [],
                    completedLearners: [],
                    isEmpty: true
                };
            }
            throw error;
        }
    }

    renderTable(data) {
        const tableBody = this.tableBody;
        if (!tableBody) return;

        if (!data || !Array.isArray(data.categories) || !Array.isArray(data.activeLearners) || !Array.isArray(data.completedLearners)) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td></tr>`;
            return;
        }

        let totalActive = 0;
        let totalCompleted = 0;

        tableBody.innerHTML = "";
        if (data.categories.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</td></tr>`;
            return;
        }

        data.categories.forEach((category, index) => {
            const active = data.activeLearners[index] || 0;
            const completed = data.completedLearners[index] || 0;

            totalActive += active;
            totalCompleted += completed;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${category || (this.type === 2 ? "ไม่มีชื่อหลักสูตร" : "ไม่มีชื่อรายวิชา")}</td>
                <td>${active.toLocaleString()}</td>
                <td>${completed.toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

        const totalRow = document.createElement("tr");
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f7fafc";
        totalRow.innerHTML = `
            <td>รวม</td>
            <td>${totalActive.toLocaleString()}</td>
            <td>${totalCompleted.toLocaleString()}</td>
        `;
        tableBody.appendChild(totalRow);
    }

    renderChart(data) {
        const ctx = this.chartContext;
        if (!ctx || !data || !Array.isArray(data.categories) || !Array.isArray(data.activeLearners) || !Array.isArray(data.completedLearners)) {
            return;
        }

        const count = data.categories.length;
        const scaleSettings = this.getScaleSettings(count);

        this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: data.categories,
                datasets: [
                    {
                        label: "ผู้ลงทะเบียน (คน)",
                        data: data.activeLearners,
                        backgroundColor: this.activeColor,
                        borderColor: this.activeColor,
                        borderWidth: 1
                    },
                    {
                        label: "ผู้เรียนจบ (คน)",
                        data: data.completedLearners,
                        backgroundColor: this.completedColor,
                        borderColor: this.completedColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString()}`
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        ticks: {
                            maxRotation: scaleSettings.maxRotation,
                            minRotation: scaleSettings.minRotation,
                            font: { size: scaleSettings.fontSize }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "จำนวน (คน)"
                        }
                    }
                }
            }
        });
    }

    getScaleSettings(count) {
        if (count <= 10) {
            return { maxRotation: 0, minRotation: 0, fontSize: 12 };
        }
        if (count <= 20) {
            return { maxRotation: 30, minRotation: 30, fontSize: 10 };
        }
        if (count <= 40) {
            return { maxRotation: 60, minRotation: 60, fontSize: 9 };
        }
        return { maxRotation: 80, minRotation: 80, fontSize: 8 };
    }

    exportToExcel() {
        if (!this.currentData || !this.startDate || !this.endDate) {
            return;
        }

        const excelData = [
            [this.type === 2 ? "หลักสูตร" : "รายวิชา", "ผู้ลงทะเบียน (คน)", "ผู้เรียนจบ (คน)"]
        ];

        const totalActive = this.currentData.activeLearners.reduce((a, b) => a + (b || 0), 0);
        const totalCompleted = this.currentData.completedLearners.reduce((a, b) => a + (b || 0), 0);
        const startStr = formatBuddhistDate(this.startDate);
        const endStr = formatBuddhistDate(this.endDate);

        this.currentData.categories.forEach((category, index) => {
            const active = this.currentData.activeLearners[index] || 0;
            const completed = this.currentData.completedLearners[index] || 0;
            excelData.push([
                category || (this.type === 2 ? "ไม่มีชื่อหลักสูตร" : "ไม่มีชื่อรายวิชา"),
                active,
                completed
            ]);
        });

        excelData.push(["รวม", totalActive, totalCompleted]);
        excelData.push([], [`ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, this.type === 2 ? "รายงานหลักสูตร" : "รายงานรายวิชา");

        XLSX.writeFile(wb, this.type === 2 ? "curriculum-report.xlsx" : "course-report.xlsx");
    }
}

class Report4 extends DateRangeReport {
    constructor() {
        super({
            startDateSelector: "#start-date",
            endDateSelector: "#end-date",
            submitButtonSelector: "#submit-btn",
            exportButtonSelector: "#export-btn",
            tableBodySelector: "#table-body",
            chartElementId: "members-chart",
            currentDateRangeLabelSelector: "#current-date-range",
            reportTitleSelector: "#report-title",
            titleIcon: "fas fa-users",
            autoSubmitOnLoad: false,
            loadingColspan: 4,
            genericErrorDetail: "ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบช่วงวันที่หรือลองใหม่ภายหลัง"
        });
        this.type = 4;
        this.activeColor = "#FF7F50";
        this.completedColor = "#4682B4";
    }

    afterInit() {
        this.loadCourseList();
    }

    validateBeforeFetch() {
        if (!super.validateBeforeFetch()) {
            return false;
        }
        if (this.getSelectedCourses().length === 0) {
            showToast("กรุณาเลือกอย่างน้อยหนึ่งรายวิชา");
            return false;
        }
        return true;
    }

    async fetchData(startDate, endDate) {
        const selectedCourses = this.getSelectedCourses();
        const courseQuery = selectedCourses.length > 0
            ? `&selectedCourses=${selectedCourses.join(",")}`
            : "";

        const start = formatChristianDate(startDate);
        const end = formatChristianDate(endDate);
        const apiUrl = `${API_BASE_URL}/reports/${this.type}?startDate=${start}&endDate=${end}${courseQuery}`;
        try {
            const response = await axios.get(apiUrl);

            if (response.status !== 200) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = response.data;
            if (!data || !Array.isArray(data.x) || !Array.isArray(data.y1) || !Array.isArray(data.y2)) {
                throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
            }

            return {
                title: data.title || "รายงานจำนวนผู้เรียนในแต่ละรายวิชา",
                categories: data.x,
                activeLearners: data.y1,
                completedLearners: data.y2,
                trainees: data.trainees || [],
                isEmpty: data.x.length === 0
            };
        } catch (error) {
            if (axios.isAxiosError?.(error) && error.response?.status === 404) {
                return {
                    title: "ไม่พบข้อมูลในช่วงวันที่ที่เลือก",
                    categories: [],
                    activeLearners: [],
                    completedLearners: [],
                    trainees: [],
                    isEmpty: true
                };
            }
            throw error;
        }
    }

    renderTable(data) {
        const tableBody = this.tableBody;
        if (!tableBody) return;

        if (!data || !Array.isArray(data.categories) || !Array.isArray(data.activeLearners) || !Array.isArray(data.completedLearners)) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td></tr>`;
            return;
        }

        let totalActive = 0;
        let totalCompleted = 0;

        tableBody.innerHTML = "";
        if (data.categories.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444;">ไม่พบข้อมูลในช่วงวันที่ที่เลือก</td></tr>`;
            return;
        }

        data.categories.forEach((category, index) => {
            const active = data.activeLearners[index] || 0;
            const completed = data.completedLearners[index] || 0;
            totalActive += active;
            totalCompleted += completed;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${category || "ไม่มีชื่อรายวิชา"}</td>
                <td>${active.toLocaleString()}</td>
                <td>${completed.toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

        const totalRow = document.createElement("tr");
        totalRow.style.fontWeight = "bold";
        totalRow.style.backgroundColor = "#f7fafc";
        totalRow.innerHTML = `
            <td>รวม</td>
            <td>${totalActive.toLocaleString()}</td>
            <td>${totalCompleted.toLocaleString()}</td>
        `;
        tableBody.appendChild(totalRow);
    }

    renderChart(data) {
        const ctx = this.chartContext;
        if (!ctx || !data || !Array.isArray(data.categories) || !Array.isArray(data.activeLearners) || !Array.isArray(data.completedLearners)) {
            return;
        }

        const count = data.categories.length;
        const scaleSettings = this.getScaleSettings(count);

        this.chartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: data.categories,
                datasets: [
                    {
                        label: "ผู้ลงทะเบียน (คน)",
                        data: data.activeLearners,
                        backgroundColor: this.activeColor,
                        borderColor: this.activeColor,
                        borderWidth: 1
                    },
                    {
                        label: "ผู้เรียนจบ (คน)",
                        data: data.completedLearners,
                        backgroundColor: this.completedColor,
                        borderColor: this.completedColor,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString()}`
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        ticks: {
                            maxRotation: scaleSettings.maxRotation,
                            minRotation: scaleSettings.minRotation,
                            font: { size: scaleSettings.fontSize }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "จำนวน (คน)"
                        }
                    }
                }
            }
        });
    }

    getScaleSettings(count) {
        if (count <= 3) return { maxRotation: 0, minRotation: 0, fontSize: 8 };
        if (count <= 6) return { maxRotation: 20, minRotation: 20, fontSize: 7 };
        if (count <= 10) return { maxRotation: 40, minRotation: 40, fontSize: 7 };
        if (count <= 15) return { maxRotation: 50, minRotation: 50, fontSize: 6 };
        if (count <= 20) return { maxRotation: 60, minRotation: 60, fontSize: 6 };
        if (count <= 30) return { maxRotation: 70, minRotation: 70, fontSize: 6 };
        if (count <= 40) return { maxRotation: 80, minRotation: 80, fontSize: 6 };
        if (count <= 50) return { maxRotation: 85, minRotation: 85, fontSize: 6 };
        return { maxRotation: 90, minRotation: 90, fontSize: 6 };
    }

    async exportToExcel() {
        if (!this.currentData || !this.startDate || !this.endDate) {
            return;
        }

        const X = window.XlsxPopulate;
        const wb = await X.fromBlankAsync();

        const excelData = [
            ["รายวิชา", "ผู้ลงทะเบียน (คน)", "ผู้เรียนจบ (คน)"]
        ];
        const totalActive = this.currentData.activeLearners.reduce((a, b) => a + (b || 0), 0);
        const totalCompleted = this.currentData.completedLearners.reduce((a, b) => a + (b || 0), 0);
        const startStr = formatBuddhistDate(this.startDate);
        const endStr = formatBuddhistDate(this.endDate);

        this.currentData.categories.forEach((category, index) => {
            const active = this.currentData.activeLearners[index] || 0;
            const completed = this.currentData.completedLearners[index] || 0;
            excelData.push([category || "ไม่มีชื่อรายวิชา", active, completed]);
        });

        excelData.push(["รวม", totalActive, totalCompleted]);
        excelData.push([], [`ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`]);

        const courseSheet = wb.addSheet("รายงานรายวิชา");
        courseSheet.cell("A1").value(excelData);

        const trainees = this.currentData.trainees ?? [];
        const keys = [
            "userType", "nin", "title", "firstName", "lastName", "gender",
            "jobTitle", "jobType", "jobLevel", "ministry", "department", "division",
            "courseCode", "courseName", "registrationDate", "preTestScore",
            "preTestFullScore", "postTestScore", "postTestFullScore", "status", "completeDate"
        ];
        const headers = [
            "ประเภท", "เลขประจำตัวประชาชน", "คำนำหน้า", "ชื่อ", "นามสกุล", "เพศ",
            "ตำแหน่ง", "ประเภทตำแหน่ง", "ระดับตำแหน่ง", "กระทรวง", "กรม", "กอง",
            "รหัสวิชา", "ชื่อวิชา", "วันเวลาที่ลงทะเบียนเรียน", "คะแนน pre-test ที่ได้",
            "คะแนนเต็ม pre-test ที่ได้", "คะแนน post-test", "คะแนนเต็ม post-test ที่ได้", "สถานะ", "วันเวลาที่เรียนจบ"
        ];

        const detailSheet = wb.addSheet("รายชื่อผู้เข้าอบรม");
        const rows = [
            headers,
            ...trainees.map((t) => keys.map((key) => t?.[key] ?? ""))
        ];
        detailSheet.cell("A1").value(rows);

        wb.deleteSheet("Sheet1");

        const startDateStr = this.startDate.toISOString().slice(0, 10).replace(/-/g, "");
        const endDateStr = this.endDate.toISOString().slice(0, 10).replace(/-/g, "");
        const fileName = `course-report-${startDateStr}-${endDateStr}.xlsx`;

        const blob = await wb.outputAsync({
            type: "blob",
            password: "csti-ocsc"
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async loadCourseList() {
        const firstRow = document.getElementById("first-row");
        const secondRow = document.getElementById("second-row");
        const courseGrid = document.getElementById("course-grid");
        const isWideScreen = window.innerWidth >= 1800;

        if (!firstRow || !secondRow || !courseGrid) return;

        if (isWideScreen) {
            firstRow.style.display = "none";
            secondRow.style.display = "none";
            courseGrid.style.display = "grid";
        } else {
            firstRow.style.display = "flex";
            secondRow.style.display = "flex";
            courseGrid.style.display = "none";
        }

        const groupNames = {
            KD: "1. การพัฒนาองค์ความรู้ (KD)",
            MS: "2. การพัฒนากรอบความคิด (MS)",
            SL: "3. ทักษะเชิงยุทธศาสตร์ (SL)",
            DS: "4. ทักษะดิจิทัล (DS)",
            LS: "5. ทักษะด้านภาษา (LS)"
        };

        try {
            const response = await axios.get(`${API_BASE_URL}/courses`);
            const allCourses = response.data;
            const groupOrder = ["KD", "MS", "SL", "DS", "LS"];

            groupOrder.forEach((group, index) => {
                const coursesInGroup = allCourses.filter((course) =>
                    course.code?.startsWith(group)
                );

                if (coursesInGroup.length === 0) return;

                const wrapper = document.createElement("div");
                wrapper.className = "course-category";

                const title = document.createElement("div");
                title.className = "category-title";
                title.textContent = groupNames[group] || group;

                const column = document.createElement("div");
                column.className = "course-column";

                coursesInGroup.forEach((course) => {
                    const label = document.createElement("label");
                    label.className = "course-checkbox";

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.value = course.code;
                    checkbox.className = "course-filter";

                    const courseText = document.createElement("span");
                    courseText.textContent = `${course.code} - ${course.name}`;

                    label.appendChild(checkbox);
                    label.appendChild(courseText);
                    column.appendChild(label);
                });

                wrapper.appendChild(title);
                wrapper.appendChild(column);

                const clone = wrapper.cloneNode(true);
                courseGrid.appendChild(wrapper);
                if (index < 3) {
                    firstRow.appendChild(clone);
                } else {
                    secondRow.appendChild(clone);
                }
            });
        } catch (error) {
            console.error("ไม่สามารถโหลดรายวิชาได้:", error);
            const container = document.getElementById("course-selection");
            if (container) {
                container.innerHTML = `<p class="error-message">เกิดข้อผิดพลาดในการโหลดรายวิชา</p>`;
            }
        }
    }

    getSelectedCourses() {
        const checkboxes = document.querySelectorAll(".course-filter:checked");
        return Array.from(checkboxes).map((checkbox) => checkbox.value);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const reportMap = [
        { match: "report1.html", factory: () => new MemberReport() },
        { match: "report2.html", factory: () => new CourseReportSystem(2) },
        { match: "report3.html", factory: () => new CourseReportSystem(3) },
        { match: "report4.html", factory: () => new Report4() },
        { match: "report5.html", factory: () => new ActiveUsersReport() }
    ];

    const entry = reportMap.find((item) => path.includes(item.match));
    if (entry) {
        entry.factory();
    }
});
