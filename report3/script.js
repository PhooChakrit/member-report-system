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
    //             categories: ["รายวิชา Mock A", "รายวิชา Mock B", "รายวิชา Mock C"],
    //             activeLearners: [50, 80, 30],
    //             completedLearners: [20, 40, 10]
    //         };
    //     }

    //     try {
    //         // const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/courses?start_date=${this.formatChristianDate(startDate)}&end_date=${this.formatChristianDate(endDate)}`;
    //         // const response = await axios.get(apiUrl);
    //         // const data = response.data;
    //         // สร้าง mock dataset 100 รายวิชา
    //         const length =130;
    //         const data = {
    //             title: "รายงานจำลอง (Mock 100 รายวิชา)",
    //             x: Array.from({ length: length }, (_, i) => `รายวิชา Mock ${i + 1}`),
    //             y1: Array.from({ length: length }, () => Math.floor(Math.random() * 100) + 1),
    //             y2: Array.from({ length: length }, () => Math.floor(Math.random() * 50) + 1)
    //         };
    //         return {
    //             title: data.title || 'รายงานจำนวนผู้เรียนในแต่ละรายวิชา',
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

            const apiUrl = `https://learningportal.ocsc.go.th/learningspaceapi/reports/3?startDate=${this.formatChristianDate(startDate)}&endDate=${this.formatChristianDate(endDate)}`;
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
                title: data.title || 'รายงานจำนวนผู้เรียนในแต่ละรายวิชา',
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
                <td>${category || 'ไม่มีชื่อรายวิชา'}</td>
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

        // คำนวณการตั้งค่า scale ตามขนาดข้อมูล
        const getScaleSettings = (dataCount) => {
            if (dataCount <= 10) {
                return {
                    maxRotation: 0,
                    minRotation: 0,
                    fontSize: 12
                };
            } else if (dataCount <= 20) {
                return {
                    maxRotation: 30,
                    minRotation: 30,
                    fontSize: 10
                };
            } else if (dataCount <= 40) {
                return {
                    maxRotation: 60,
                    minRotation: 60,
                    fontSize: 9
                };
            } else {
                return {
                    maxRotation: 80,
                    minRotation: 80,
                    fontSize: 8
                };
            }
        };

        const scaleSettings = getScaleSettings(count);

        const generateQualitativeColors = (numColors) => {
            const baseColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
                '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393',
                '#00b894', '#00cec9', '#2d3436', '#636e72', '#74b9ff',
                '#0984e3', '#fdcb6e', '#e17055', '#81ecec', '#00b894',
                '#ff7675', '#fd79a8', '#6c5ce7', '#a29bfe', '#74b9ff',
                '#55a3ff', '#26de81', '#feca57', '#ff9ff3', '#54a0ff',
                '#5f27cd', '#00d2d3', '#ff9f43', '#ee5a24', '#0abde3',
                '#006ba6', '#0582ca', '#00a6fb', '#0075f2', '#144fc6',
                '#8e44ad', '#9b59b6', '#e74c3c', '#c0392b', '#f39c12',
                '#d35400', '#27ae60', '#2ecc71', '#16a085', '#1abc9c',
                '#34495e', '#2c3e50', '#95a5a6', '#7f8c8d', '#ecf0f1',
                '#bdc3c7', '#3498db', '#2980b9', '#e67e22', '#d35400',
                '#f1c40f', '#f39c12', '#2ecc71', '#27ae60', '#1abc9c',
                '#e78ac3', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
                '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
                '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
                '#e5c494', '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada',
                '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5',
                '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f', '#1b9e77',
                '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
                '#a6761d', '#666666', '#2ca02c', '#d62728', '#9467bd',
                '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
                // เพิ่มสีใหม่อีก 50 สี

            ];

            const colors = [];

            // ถ้าข้อมูลน้อยกว่า base colors ใช้ตรงๆ
            if (numColors <= baseColors.length) {
                return baseColors.slice(0, numColors);
            }

            // ถ้าข้อมูลเยอะกว่า ใช้ Golden Angle สร้างเพิ่ม
            for (let i = 0; i < numColors; i++) {
                if (i < baseColors.length) {
                    colors.push(baseColors[i]);
                } else {
                    const hue = (i * 137.508) % 360;
                    const saturation = 70 + (i % 4) * 5;
                    const lightness = 45 + (Math.floor(i / 4) % 4) * 8;
                    colors.push(`hsl(${Math.floor(hue)}, ${saturation}%, ${lightness}%)`);
                }
            }

            return colors;
        };

        const baseColors = generateQualitativeColors(count);

        // สร้างสีสำหรับแต่ละ dataset
        const activeColors = [];
        const completedColors = [];

        for (let i = 0; i < count; i++) {
            const baseColor = baseColors[i];
            activeColors.push(baseColor);
            let completedColor;
            if (baseColor.startsWith('#')) {
                completedColor = this.darkenHexColor(baseColor, 0.3);
            } else {
                completedColor = this.adjustHSLLightness(baseColor, -25);
            }
            completedColors.push(completedColor);
        }

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.categories,
                datasets: [
                    {
                        label: 'กำลังเรียน',
                        data: data.activeLearners,
                        backgroundColor: activeColors,
                        borderColor: activeColors,
                        borderWidth: 1
                    },
                    {
                        label: 'เรียนจบ',
                        data: data.completedLearners,
                        backgroundColor: completedColors,
                        borderColor: completedColors,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
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
                    x: {
                        stacked: false,
                        ticks: {
                            maxRotation: scaleSettings.maxRotation,
                            minRotation: scaleSettings.minRotation,
                            font: {
                                size: scaleSettings.fontSize
                            }
                        }
                    },
                    y: { beginAtZero: true }
                }
            }
        });
    }
    // เพิ่มฟังก์ชันช่วยสำหรับการปรับสี hex
    darkenHexColor(hex, factor) {
        // แปลง hex เป็น RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // ทำให้เข้มขึ้น
        const newR = Math.floor(r * (1 - factor));
        const newG = Math.floor(g * (1 - factor));
        const newB = Math.floor(b * (1 - factor));

        // แปลงกลับเป็น hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    // ปรับปรุงฟังก์ชัน adjustHSLLightness เดิม
    adjustHSLLightness(hslColor, adjustment) {
        const hslMatch = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (!hslMatch) return hslColor;

        const hue = parseInt(hslMatch[1]);
        const saturation = parseInt(hslMatch[2]);
        const lightness = Math.max(15, Math.min(85, parseInt(hslMatch[3]) + adjustment));

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }


    exportToExcel() {
        if (!this.currentData || !this.startDate || !this.endDate) return;

        const excelData = [
            ['รายวิชา', 'กำลังเรียน (คน)', 'เรียนจบ (คน)', 'รวมทั้งหมด (คน)']
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
                category || 'ไม่มีชื่อรายวิชา',
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
        XLSX.utils.book_append_sheet(wb, ws, "รายงานรายวิชา");

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