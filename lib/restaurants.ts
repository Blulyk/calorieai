export interface RestaurantItem {
  chain: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  portion: string
}

export const RESTAURANTS: RestaurantItem[] = [
  // McDonald's
  { chain: "McDonald's", name: "Big Mac", calories: 550, protein: 25, carbs: 45, fat: 30, portion: "1 unidad (210g)" },
  { chain: "McDonald's", name: "McPollo", calories: 399, protein: 24, carbs: 39, fat: 15, portion: "1 unidad (165g)" },
  { chain: "McDonald's", name: "Cuarto de Libra con Queso", calories: 520, protein: 29, carbs: 40, fat: 25, portion: "1 unidad (200g)" },
  { chain: "McDonald's", name: "McNuggets 6 piezas", calories: 280, protein: 16, carbs: 22, fat: 14, portion: "6 unidades (96g)" },
  { chain: "McDonald's", name: "McNuggets 9 piezas", calories: 420, protein: 24, carbs: 33, fat: 21, portion: "9 unidades (144g)" },
  { chain: "McDonald's", name: "Patatas fritas pequeñas", calories: 230, protein: 3, carbs: 31, fat: 11, portion: "1 ración (71g)" },
  { chain: "McDonald's", name: "Patatas fritas medianas", calories: 340, protein: 4, carbs: 46, fat: 16, portion: "1 ración (107g)" },
  { chain: "McDonald's", name: "Patatas fritas grandes", calories: 444, protein: 5, carbs: 60, fat: 21, portion: "1 ración (154g)" },
  { chain: "McDonald's", name: "McFlurry Oreo", calories: 410, protein: 8, carbs: 60, fat: 14, portion: "1 unidad (286g)" },
  { chain: "McDonald's", name: "Hamburguesa simple", calories: 252, protein: 13, carbs: 30, fat: 9, portion: "1 unidad (102g)" },
  { chain: "McDonald's", name: "Doble hamburguesa", calories: 395, protein: 22, carbs: 33, fat: 19, portion: "1 unidad (155g)" },
  { chain: "McDonald's", name: "Filet-O-Fish", calories: 329, protein: 15, carbs: 38, fat: 13, portion: "1 unidad (142g)" },
  { chain: "McDonald's", name: "McSundae Caramelo", calories: 340, protein: 6, carbs: 56, fat: 10, portion: "1 unidad (219g)" },
  // Burger King
  { chain: "Burger King", name: "Whopper", calories: 630, protein: 28, carbs: 49, fat: 35, portion: "1 unidad (270g)" },
  { chain: "Burger King", name: "Doble Whopper", calories: 900, protein: 47, carbs: 49, fat: 55, portion: "1 unidad (351g)" },
  { chain: "Burger King", name: "Whopper Jr", calories: 370, protein: 18, carbs: 31, fat: 21, portion: "1 unidad (165g)" },
  { chain: "Burger King", name: "Chicken Royale", calories: 630, protein: 34, carbs: 54, fat: 30, portion: "1 unidad (257g)" },
  { chain: "Burger King", name: "Long Chicken", calories: 540, protein: 29, carbs: 48, fat: 24, portion: "1 unidad (217g)" },
  { chain: "Burger King", name: "Patatas medianas BK", calories: 360, protein: 4, carbs: 49, fat: 16, portion: "1 ración (117g)" },
  { chain: "Burger King", name: "Onion Rings medianos", calories: 410, protein: 5, carbs: 54, fat: 20, portion: "1 ración (105g)" },
  { chain: "Burger King", name: "Aros de cebolla grandes", calories: 550, protein: 7, carbs: 73, fat: 27, portion: "1 ración (145g)" },
  { chain: "Burger King", name: "Nuggets de pollo 8 piezas", calories: 330, protein: 18, carbs: 28, fat: 16, portion: "8 unidades" },
  // KFC
  { chain: "KFC", name: "Hamburguesa Original", calories: 440, protein: 25, carbs: 38, fat: 20, portion: "1 unidad (185g)" },
  { chain: "KFC", name: "Hamburguesa Zinger", calories: 500, protein: 27, carbs: 45, fat: 23, portion: "1 unidad (200g)" },
  { chain: "KFC", name: "Pieza muslo Original", calories: 260, protein: 20, carbs: 9, fat: 17, portion: "1 pieza (120g)" },
  { chain: "KFC", name: "Pieza alita Original", calories: 120, protein: 11, carbs: 4, fat: 7, portion: "1 pieza (55g)" },
  { chain: "KFC", name: "Pechuga Original", calories: 390, protein: 39, carbs: 11, fat: 21, portion: "1 pieza (195g)" },
  { chain: "KFC", name: "Popcorn Chicken mediano", calories: 330, protein: 19, carbs: 25, fat: 16, portion: "1 ración (122g)" },
  { chain: "KFC", name: "Nuggets 6 piezas KFC", calories: 250, protein: 14, carbs: 19, fat: 12, portion: "6 unidades (85g)" },
  { chain: "KFC", name: "Coleslaw individual", calories: 180, protein: 1, carbs: 16, fat: 12, portion: "1 ración (113g)" },
  { chain: "KFC", name: "Patatas KFC medianas", calories: 345, protein: 5, carbs: 50, fat: 14, portion: "1 ración (130g)" },
  // Starbucks
  { chain: "Starbucks", name: "Café Latte Grande (leche entera)", calories: 190, protein: 12, carbs: 19, fat: 7, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Café Latte Grande (leche desnat.)", calories: 130, protein: 13, carbs: 19, fat: 0, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Cappuccino Grande", calories: 150, protein: 10, carbs: 16, fat: 5, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Americano Grande", calories: 15, protein: 1, carbs: 3, fat: 0, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Frappuccino Caramel Grande", calories: 370, protein: 5, carbs: 57, fat: 13, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Frappuccino Mocha Grande", calories: 400, protein: 6, carbs: 57, fat: 16, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Té Chai Latte Grande", calories: 240, protein: 10, carbs: 41, fat: 5, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Matcha Latte Grande", calories: 240, protein: 12, carbs: 34, fat: 6, portion: "1 vaso 473ml" },
  { chain: "Starbucks", name: "Croissant de mantequilla", calories: 310, protein: 6, carbs: 34, fat: 16, portion: "1 unidad (94g)" },
  { chain: "Starbucks", name: "Muffin de arándanos", calories: 390, protein: 6, carbs: 57, fat: 16, portion: "1 unidad (130g)" },
  // Five Guys
  { chain: "Five Guys", name: "Hamburguesa Five Guys", calories: 700, protein: 40, carbs: 40, fat: 43, portion: "1 unidad (304g)" },
  { chain: "Five Guys", name: "Hamburguesa Little", calories: 550, protein: 27, carbs: 39, fat: 33, portion: "1 unidad (221g)" },
  { chain: "Five Guys", name: "Cheeseburger Five Guys", calories: 840, protein: 47, carbs: 40, fat: 55, portion: "1 unidad (337g)" },
  { chain: "Five Guys", name: "Patatas fritas pequeñas Five Guys", calories: 526, protein: 7, carbs: 68, fat: 25, portion: "1 ración (227g)" },
  { chain: "Five Guys", name: "Milkshake Vainilla", calories: 630, protein: 14, carbs: 92, fat: 22, portion: "1 vaso (454ml)" },
  // Subway
  { chain: "Subway", name: "Sub de Pavo 15cm", calories: 280, protein: 18, carbs: 46, fat: 5, portion: "15cm sin extras" },
  { chain: "Subway", name: "Sub de Atún 15cm", calories: 370, protein: 18, carbs: 45, fat: 14, portion: "15cm sin extras" },
  { chain: "Subway", name: "Sub Vegetal Delite 15cm", calories: 230, protein: 10, carbs: 45, fat: 3, portion: "15cm sin extras" },
  { chain: "Subway", name: "Sub de Pollo Teriyaki 15cm", calories: 330, protein: 21, carbs: 52, fat: 5, portion: "15cm sin extras" },
  { chain: "Subway", name: "Sub BLT 15cm", calories: 340, protein: 16, carbs: 45, fat: 12, portion: "15cm sin extras" },
  { chain: "Subway", name: "Sub de Jamón y Queso 15cm", calories: 290, protein: 18, carbs: 45, fat: 7, portion: "15cm sin extras" },
  // Comida rápida genérica
  { chain: "Genérico", name: "Kebab de pollo", calories: 480, protein: 30, carbs: 42, fat: 18, portion: "1 kebab completo" },
  { chain: "Genérico", name: "Kebab de ternera", calories: 530, protein: 28, carbs: 42, fat: 24, portion: "1 kebab completo" },
  { chain: "Genérico", name: "Pizza Margarita (1 porción)", calories: 200, protein: 9, carbs: 27, fat: 6, portion: "1 porción (1/8 pizza 30cm)" },
  { chain: "Genérico", name: "Pizza Pepperoni (1 porción)", calories: 240, protein: 11, carbs: 26, fat: 11, portion: "1 porción (1/8 pizza 30cm)" },
  { chain: "Genérico", name: "Pizza 4 Quesos (1 porción)", calories: 270, protein: 13, carbs: 25, fat: 14, portion: "1 porción (1/8 pizza 30cm)" },
  { chain: "Genérico", name: "Bocadillo de jamón serrano", calories: 320, protein: 22, carbs: 38, fat: 8, portion: "1 bocadillo (150g)" },
  { chain: "Genérico", name: "Tortilla española (ración)", calories: 250, protein: 12, carbs: 18, fat: 14, portion: "1 ración (120g)" },
  { chain: "Genérico", name: "Croquetas de jamón (6 ud)", calories: 360, protein: 10, carbs: 32, fat: 22, portion: "6 croquetas" },
  { chain: "Genérico", name: "Patatas bravas (ración)", calories: 300, protein: 4, carbs: 38, fat: 14, portion: "1 ración (200g)" },
  { chain: "Genérico", name: "Ensalada mixta (ración)", calories: 120, protein: 4, carbs: 10, fat: 7, portion: "1 ración (200g)" },
]

export function searchRestaurants(query: string): RestaurantItem[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return RESTAURANTS.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.chain.toLowerCase().includes(q)
  ).slice(0, 12)
}
