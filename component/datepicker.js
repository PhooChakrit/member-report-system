export function setupThaiDatePicker(selector, onChangeCallback, defaultDate = "today") {
    const monthsThai = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    const formatBuddhistDate = (date) => {
        const day = date.getDate();
        const month = monthsThai[date.getMonth()];
        const year = date.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    };

    const convertToBuddhistYear = (instance) => {
        setTimeout(() => {
            const yearInputs = instance.calendarContainer.querySelectorAll(".cur-year");
            yearInputs.forEach(el => {
                let year = parseInt(el.value || el.textContent);
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
        defaultDate: defaultDate,
        onReady: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
            overrideDisplayedDate(instance);
            if (selectedDates.length > 0) {
                const date = selectedDates[0];
                instance.input.dataset.isoDate = date.toISOString().split('T')[0];
            }
        },
        onOpen: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onMonthChange: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onYearChange: (selectedDates, dateStr, instance) => {
            convertToBuddhistYear(instance);
        },
        onChange: (selectedDates, dateStr, instance) => {
            if (selectedDates.length === 0) return;
            const selectedDate = selectedDates[0];
            selectedDate.setHours(12, 0, 0, 0);
            instance.input.dataset.isoDate = selectedDate.toISOString().split('T')[0];
            instance.input.value = formatBuddhistDate(selectedDate);
            convertToBuddhistYear(instance);
            if (onChangeCallback) {
                onChangeCallback(selectedDate);
            }
        },
        onClose: (selectedDates, dateStr, instance) => {
            overrideDisplayedDate(instance);
        }
    });
}

export function formatBuddhistDate(date) {
    const monthsThai = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const day = date.getDate();
    const month = monthsThai[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

export function setDefaultThaiDate(selector) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const input = document.querySelector(selector);
    if (input) {
        input.value = formatBuddhistDate(today);
        input.dataset.isoDate = today.toISOString().split('T')[0];
    }
    return today;
}

