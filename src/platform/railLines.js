// «رحلة القطار السريع» (lesson 3): the three high-speed lines as a teaching
// drawing. Paths follow the hand-drawn route in public/geodata/
// egypt-fast-train.geojson (traced from the textbook's national-projects map);
// stations sit at the cities named on that map and in the book. Approximate:
// not an engineering or survey route, and it needs teacher review.
// Coordinates are [lat, lng]; `side` places a station name where it does not
// collide with its neighbours.
export const RAIL_NOTE = "مسار تعليمي تقريبي عن خريطة الكتاب المدرسي؛ ليس مسارًا هندسيًا رسميًا.";

export const RAIL_LINES = [
  {
    id: "green",
    name: "الخط الأخضر",
    color: "#1f9d55",
    // The line on the map glows in neon green (the teacher's design); the
    // buttons and card keep the darker green so white text stays readable.
    glow: "#39ff6e",
    path: [
      [29.6, 32.32],
      [29.85, 32.05],
      [30.02, 31.75],
      [29.97, 31.45],
      [29.93, 31.2],
      [30.0, 30.95],
      [30.25, 30.55],
      [30.45, 30.1],
      [30.62, 29.55],
      [30.83, 28.95],
      [30.95, 28.4],
      [31.15, 27.8],
      [31.35, 27.24],
    ],
    stations: [
      { at: 0, side: "right", name: "العين السخنة", info: "مدينة على خليج السويس، ومنها يبدأ الخط الأخضر." },
      { at: 2, name: "العاصمة الإدارية الجديدة", info: "مدينة جديدة شرق القاهرة، من المشروعات القومية في هذا الدرس." },
      { at: 5, name: "السادس من أكتوبر", info: "مدينة جديدة غرب القاهرة، يلتقي عندها الخط الأخضر بالخط الأزرق." },
      { at: 9, name: "العلمين الجديدة", info: "مدينة جديدة على ساحل البحر المتوسط." },
      { at: 12, name: "مرسى مطروح", info: "مدينة على ساحل البحر المتوسط في الشمال الغربي، ونهاية الخط الأخضر." },
    ],
  },
  {
    id: "blue",
    name: "الخط الأزرق",
    color: "#1a5fd0",
    path: [
      [30.0, 30.95],
      [29.4, 30.8],
      [28.7, 30.65],
      [28.1, 30.6],
      [27.5, 30.75],
      [27.0, 31.05],
      [26.55, 31.55],
      [26.15, 32.1],
      [26.05, 32.55],
      [25.7, 32.58],
      [24.98, 32.84],
      [24.47, 32.9],
      [24.09, 32.85],
      [23.55, 32.55],
      [22.95, 32.1],
      [22.35, 31.62],
    ],
    stations: [
      { at: 0, name: "السادس من أكتوبر", info: "بداية الخط الأزرق، ومنها يتجه القطار جنوبًا بمحاذاة وادي النيل." },
      { at: 3, name: "المنيا", info: "محافظة في صعيد مصر على نهر النيل." },
      { at: 5, name: "أسيوط", info: "من أكبر مدن صعيد مصر، على نهر النيل." },
      { at: 9, name: "الأقصر", info: "مدينة على نهر النيل، بها كثير من الآثار المصرية القديمة." },
      { at: 12, name: "أسوان", info: "مدينة في جنوب مصر، بالقرب منها السد العالي." },
      { at: 15, name: "أبو سمبل", info: "في أقصى جنوب مصر، ونهاية الخط الأزرق." },
    ],
  },
  {
    id: "red",
    name: "الخط الأحمر",
    color: "#d61f26",
    path: [
      [26.05, 32.55],
      [26.18, 32.75],
      [26.55, 33.15],
      [26.95, 33.55],
      [27.22, 33.8],
    ],
    stations: [
      { at: 0, side: "left", name: "قنا", info: "محافظة في صعيد مصر، ومنها يبدأ الخط الأحمر نحو البحر الأحمر." },
      { at: 4, side: "right", name: "الغردقة", info: "مدينة على ساحل البحر الأحمر، ونهاية الخط الأحمر." },
    ],
  },
];
