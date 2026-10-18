import { UomCategory, UomCode, UomSymbol } from "./enums";

type UomEntry = { name: string; code: UomCode; symbol: UomSymbol };

export const UOM_SEED_DATA: Record<UomCategory, UomEntry[]> = {
  [UomCategory.WEIGHT]: [
    { name: "Gram", code: UomCode.GRAM, symbol: UomSymbol.GRAM },
    { name: "Kilogram", code: UomCode.KILOGRAM, symbol: UomSymbol.KILOGRAM },
    { name: "Milligram", code: UomCode.MILLIGRAM, symbol: UomSymbol.MILLIGRAM },
    { name: "Ton", code: UomCode.TON, symbol: UomSymbol.TON },
    { name: "Pound", code: UomCode.POUND, symbol: UomSymbol.POUND },
    { name: "Ounce", code: UomCode.OUNCE, symbol: UomSymbol.OUNCE },
    { name: "Quintal", code: UomCode.QUINTAL, symbol: UomSymbol.QUINTAL },
  ],
  [UomCategory.VOLUME]: [
    { name: "Milliliter", code: UomCode.MILLILITER, symbol: UomSymbol.MILLILITER },
    { name: "Liter", code: UomCode.LITER, symbol: UomSymbol.LITER },
    { name: "Fluid Ounce", code: UomCode.FLUID_OUNCE, symbol: UomSymbol.FLUID_OUNCE },
    { name: "Gallon", code: UomCode.GALLON, symbol: UomSymbol.GALLON },
  ],
  [UomCategory.LENGTH]: [
    { name: "Millimeter", code: UomCode.MILLIMETER, symbol: UomSymbol.MILLIMETER },
    { name: "Centimeter", code: UomCode.CENTIMETER, symbol: UomSymbol.CENTIMETER },
    { name: "Meter", code: UomCode.METER, symbol: UomSymbol.METER },
    { name: "Inch", code: UomCode.INCH, symbol: UomSymbol.INCH },
    { name: "Foot", code: UomCode.FOOT, symbol: UomSymbol.FOOT },
  ],
  [UomCategory.COUNT]: [
    { name: "Piece", code: UomCode.PIECE, symbol: UomSymbol.PIECE },
    { name: "Packet", code: UomCode.PACKET, symbol: UomSymbol.PACKET },
    { name: "Box", code: UomCode.BOX, symbol: UomSymbol.BOX },
    { name: "Carton", code: UomCode.CARTON, symbol: UomSymbol.CARTON },
    { name: "Bag", code: UomCode.BAG, symbol: UomSymbol.BAG },
    { name: "Sack", code: UomCode.SACK, symbol: UomSymbol.SACK },
    { name: "Roll", code: UomCode.ROLL, symbol: UomSymbol.ROLL },
    { name: "Strip", code: UomCode.STRIP, symbol: UomSymbol.STRIP },
    { name: "Dozen", code: UomCode.DOZEN, symbol: UomSymbol.DOZEN },
    { name: "Pallet", code: UomCode.PALLET, symbol: UomSymbol.PALLET },
  ],
};

export const UOM_SEED_FLAT = (Object.entries(UOM_SEED_DATA) as [UomCategory, UomEntry[]][]).flatMap(
  ([category, uoms]) => uoms.map((uom) => ({ ...uom, category })),
);

/** Maps each system UomCode → its correct UomCategory */
export const UOM_CATEGORY_BY_CODE = Object.fromEntries(
  UOM_SEED_FLAT.map(({ code, category }) => [code, category]),
) as Record<UomCode, UomCategory>;

/** Maps each system UomCode → its correct UomSymbol */
export const UOM_SYMBOL_BY_CODE = Object.fromEntries(
  UOM_SEED_FLAT.map(({ code, symbol }) => [code, symbol]),
) as Record<UomCode, UomSymbol>;

/** Maps each system UomSymbol → its owning UomCode (for reverse lookup) */
export const UOM_CODE_BY_SYMBOL = Object.fromEntries(
  UOM_SEED_FLAT.map(({ symbol, code }) => [symbol, code]),
) as Record<UomSymbol, UomCode>;
