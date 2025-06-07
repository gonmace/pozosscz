
const dragModal = (modalBoxId: string, handleId: string) => {
    const modal = document.getElementById(modalBoxId) as HTMLElement;
    const handle = document.getElementById(handleId) as HTMLElement;

    if (!modal || !handle) {
        console.error('Modal or handle elements not found');
        return;
    }

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            modal.style.position = 'fixed';
            modal.style.margin = '0';
            modal.style.left = `${e.clientX - offsetX}px`;
            modal.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
};

export default dragModal;