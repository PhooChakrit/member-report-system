import { setupThaiDatePicker, formatBuddhistDate, setDefaultThaiDate } from '../component/datepicker.js';

class CourseReportSystem {
    constructor() {
        this.chartInstance = null;
        this.currentData = null;
        this.startDate = null;
        this.endDate = null;
        this.colorPalette = this.generateColorPalette(100);
        this.init();
        this.useMock = true;

    }

    init() {
        setupThaiDatePicker('#start-date', (startDate) => {
            this.startDate = startDate;
            const buddhistDateStr = formatBuddhistDate(startDate);
            document.getElementById("start-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDateStr}`;
        });

        this.startDate = setDefaultThaiDate('#start-date');
        document.getElementById("start-date").textContent =
            `ข้อมูล ณ วันที่ ${formatBuddhistDate(this.startDate)}`;

        setupThaiDatePicker('#end-date', (endDate) => {
            this.endDate = endDate;
            const buddhistDateStr = formatBuddhistDate(endDate);
            document.getElementById("end-date").textContent = `ข้อมูล ณ วันที่ ${buddhistDateStr}`;
        });

        this.endDate = setDefaultThaiDate('#end-date');
        document.getElementById("end-date").textContent =
            `ข้อมูล ณ วันที่ ${formatBuddhistDate(this.endDate)}`;
        this.updateDateDisplay();
        this.setupEventListeners();
        this.generateReport();
    }


    updateDateDisplay() {
        if (this.startDate && this.endDate) {
            const startStr = formatBuddhistDate(this.startDate);
            const endStr = formatBuddhistDate(this.endDate);
            document.getElementById("current-date-range").textContent =
                `ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`;
        }
    }


    formatChristianDate(date) {
        return date.toISOString().split('T')[0];
    }

    setupEventListeners() {
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    // async fetchCourseData(startDate, endDate) {
    //     if (this.useMock) {
    //         return {
    //             title: "รายงานจำลอง (Mock)",
    //             categories: ["หลักสูตร Mock A", "หลักสูตร Mock B", "หลักสูตร Mock C"],
    //             activeLearners: [50, 80, 30],
    //             completedLearners: [20, 40, 10]
    //         };
    //     }

    //     try {
    //         // const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/courses?start_date=${this.formatChristianDate(startDate)}&end_date=${this.formatChristianDate(endDate)}`;
    //         // const response = await axios.get(apiUrl);
    //         // const data = response.data;
    //         const data = {
    //             title: "รายงานจำลอง (Mock)",
    //             categories: ["หลักสูตร Mock A", "หลักสูตร Mock B", "หลักสูตร Mock C"],
    //             activeLearners: [50, 80, 30],
    //             completedLearners: [20, 40, 10]
    //         }
    //         return {
    //             title: data.title || 'รายงานจำนวนผู้เรียนในแต่ละหลักสูตร',
    //             categories: data.x,
    //             activeLearners: data.y1,
    //             completedLearners: data.y2
    //         };
    //     } catch (error) {
    //         console.error('Error fetching data:', error);
    //         throw error;
    //     }
    // }
    async fetchCourseData(startDate, endDate) {
        try {

            const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/2?startDate=${this.formatChristianDate(startDate)}&endDate=${this.formatChristianDate(endDate)}`;
            const response = await axios.get(apiUrl);
            console.log(`Fetching data from: ${apiUrl}`);

            if (response.status !== 200) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const data = response.data;
            if (!data || !Array.isArray(data.x) || !Array.isArray(data.y1) || !Array.isArray(data.y2)) {
                throw new Error('รูปแบบข้อมูลจาก API ไม่ถูกต้อง');
            }

            return {
                title: data.title || 'รายงานจำนวนผู้เรียนในแต่ละหลักสูตร',
                categories: data.x,
                activeLearners: data.y1,
                completedLearners: data.y2
            };

        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async generateReport() {
        if (!this.startDate || !this.endDate) {
            this.showToast('กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุด');
            return;
        }

        if (this.startDate > this.endDate) {
            this.showToast('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }

        this.hideError();
        document.getElementById('results-container').classList.remove('show');
        document.getElementById('loading').classList.add('show');

        try {
            const data = await this.fetchCourseData(this.startDate, this.endDate);
            console.log('Fetched data:', data);

            this.currentData = data;
            // console.log('Fetched data:', data);


            this.renderTable(data);
            this.renderChart(data);

            const startStr = formatBuddhistDate(this.startDate);
            const endStr = formatBuddhistDate(this.endDate);
            document.getElementById("current-date-range").textContent =
                `ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`;
            document.getElementById("report-title").innerHTML =
                `<i class="fas fa-users"></i> ${data.title}`;

            document.getElementById('loading').classList.remove('show');
            document.getElementById('results-container').classList.add('show');

        } catch (error) {
            console.error('Error:', error);
            this.showError(
                `เกิดข้อผิดพลาด: ${error.message}`,
                'ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบช่วงวันที่หรือลองใหม่ภายหลัง'
            );
            document.getElementById('loading').classList.remove('show');
        }
    }

    renderTable(data) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';

        if (!data || !data.categories || !data.activeLearners || !data.completedLearners) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center; color: #ef4444;">ไม่มีข้อมูลหรือข้อมูลไม่ถูกต้อง</td>`;
            tableBody.appendChild(row);
            return;
        }

        let totalActive = 0;
        let totalCompleted = 0;

        data.categories.forEach((category, index) => {
            const active = data.activeLearners[index] || 0;
            const completed = data.completedLearners[index] || 0;
            const total = active + completed;

            totalActive += active;
            totalCompleted += completed;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${category || 'ไม่มีชื่อหลักสูตร'}</td>
                <td>${active.toLocaleString()}</td>
                <td>${completed.toLocaleString()}</td>
                <td>${total.toLocaleString()}</td>
            `;
            tableBody.appendChild(row);
        });

        // แถวรวมทั้งหมด
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#f7fafc';
        totalRow.innerHTML = `
            <td>รวมทั้งหมด</td>
            <td>${totalActive.toLocaleString()}</td>
            <td>${totalCompleted.toLocaleString()}</td>
            <td>${(totalActive + totalCompleted).toLocaleString()}</td>
        `;
        tableBody.appendChild(totalRow);
    }

    generateColorPalette(count) {
        const palette = [];
        const hueStep = 360 / count;

        for (let i = 0; i < count; i++) {
            const hue = Math.floor(i * hueStep);
            const saturation = 70 + Math.floor(Math.random() * 30);
            const lightness = 50 + Math.floor(Math.random() * 20);
            palette.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }

        return palette;
    }

    renderChart(data) {
        const ctx = document.getElementById('members-chart').getContext('2d');

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        if (!data || !data.categories || !data.activeLearners || !data.completedLearners) {
            return;
        }

        const count = data.categories.length;
        const baseColors = this.generateColorPalette(count); // ใช้ฟังก์ชันที่มีอยู่แล้ว

        // สร้างชุดสี 2 สีต่อหลักสูตร
        const activeColors = baseColors.map((color) => color);
        const completedColors = baseColors.map((color) => {
            // ปรับให้สีอ่อนลงหน่อยสำหรับแท่ง "เรียนจบ"
            return color.replace(/(\d+)%\)/, (match, lightness) => `${Math.max(parseInt(lightness) - 15, 30)}%)`);
        });

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.categories,
                datasets: [
                    {
                        label: 'กำลังเรียน',
                        data: data.activeLearners,
                    },
                    {
                        label: 'เรียนจบ',
                        data: data.completedLearners,
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            font: { family: 'Kanit' }
                        }
                    },
                    colorschemes: {
                        scheme: 'brewer.Set312' // หรือ 'tableau.Classic10', 'brewer.Paired12', ฯลฯ
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()} คน`;
                            }
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: false },
                    y: { beginAtZero: true }
                }
            },
            plugins: [ChartDataLabels]
        });

    }



    exportToExcel() {
        if (!this.currentData || !this.startDate || !this.endDate) return;

        const excelData = [
            ['หลักสูตร', 'กำลังเรียน (คน)', 'เรียนจบ (คน)', 'รวมทั้งหมด (คน)']
        ];

        const totalActive = this.currentData.activeLearners.reduce((a, b) => a + b, 0);
        const totalCompleted = this.currentData.completedLearners.reduce((a, b) => a + b, 0);
        const startStr = formatBuddhistDate(this.startDate);
        const endStr = formatBuddhistDate(this.endDate);

        this.currentData.categories.forEach((category, index) => {
            const active = this.currentData.activeLearners[index] || 0;
            const completed = this.currentData.completedLearners[index] || 0;
            const total = active + completed;

            excelData.push([
                category || 'ไม่มีชื่อหลักสูตร',
                active,
                completed,
                total
            ]);
        });

        excelData.push([
            'รวมทั้งหมด',
            totalActive,
            totalCompleted,
            totalActive + totalCompleted
        ]);

        excelData.push([], [`ข้อมูลระหว่างวันที่ ${startStr} ถึง ${endStr}`]);

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานหลักสูตร");

        const startDateStr = this.startDate.toISOString().split('T')[0].replace(/-/g, '');
        const endDateStr = this.endDate.toISOString().split('T')[0].replace(/-/g, '');
        XLSX.writeFile(wb, `course_report_${startDateStr}_${endDateStr}.xlsx`);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="toast-content">${message}</div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }

    showError(message, details = '') {
        const errorMessage = document.getElementById('error-message');
        document.getElementById('error-content').textContent = message;
        document.getElementById('error-details').textContent = details;
        errorMessage.classList.add('show');
    }

    hideError() {
        document.getElementById('error-message').classList.remove('show');
    }
}

// เริ่มต้นระบบเมื่อ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    new CourseReportSystem();
});