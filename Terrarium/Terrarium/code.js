function displayCandy() {
    let candy = ['jellybeans'];
    function addCandy(candyType) {
        candy.push(candyType);
    }
    addCandy('gumdrops');
}
displayCandy();

const plants = document.querySelectorAll('.plant');
const terrarium = document.getElementById('terrarium');
let currentTopZ = 100;

plants.forEach((plant) => {
    plant.setAttribute('draggable', 'true');
    plant.addEventListener('dragstart', handleDragStart);
    plant.addEventListener('dblclick', () => doubleclick(plant.id));
});

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    e.dataTransfer.effectAllowed = 'move';
}

terrarium.addEventListener('dragover', handleDragOver);
terrarium.addEventListener('drop', handleDrop);

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();

    const plantId = e.dataTransfer.getData('text/plain');
    const plant = document.getElementById(plantId);
    if (!plant) return;

    const beforeRect = plant.getBoundingClientRect();
    const originalWidth = beforeRect.width;
    const originalHeight = beforeRect.height;

    terrarium.appendChild(plant);

    const terrRect = terrarium.getBoundingClientRect();

    plant.style.position = 'absolute';
    plant.style.width = originalWidth + 'px';
    plant.style.height = originalHeight + 'px';
    plant.style.maxWidth = originalWidth + 'px';
    plant.style.maxHeight = originalHeight + 'px';

    const x = e.clientX - terrRect.left - originalWidth / 2;
    const y = e.clientY - terrRect.top - originalHeight / 2;
    plant.style.left = x + 'px';
    plant.style.top = y + 'px';

    currentTopZ += 1;
    plant.style.zIndex = currentTopZ;
}

function doubleclick(plantId) {
    const plant = document.getElementById(plantId);
    if (!plant) return;

    currentTopZ += 1;
    plant.style.zIndex = currentTopZ;
}