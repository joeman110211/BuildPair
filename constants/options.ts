export const TRADE_CATEGORIES = [
  'Tiling',
  'Bathrooms',
  'Kitchens',
  'Plumbing',
  'Heating & Gas',
  'Electrical',
  'Renewables & EV',
  'Building & Extensions',
  'Conversions',
  'Brickwork & Masonry',
  'Carpentry & Joinery',
  'Plastering, Rendering & Dry Lining',
  'Painting & Decorating',
  'Roofing & Roofline',
  'Windows, Doors & Glazing',
  'Flooring & Screeding',
  'Landscaping & Gardening',
  'Tree Surgery',
  'Fencing & Decking',
  'Driveways, Paving & Groundworks',
  'Drainage & Sewage',
  'Damp Proofing & Insulation',
  'Cladding & Exterior Finishes',
  'Chimneys & Fireplaces',
  'Air Conditioning & Ventilation',
  'Security, Smart Home & Locksmiths',
  'Handyman & Property Maintenance',
  'Commercial Fit-Out & Access',
  'Demolition, Asbestos & Waste',
  'Cleaning, Exterior Care & Pest Control',
  'Garden Buildings & Leisure',
  'Accessibility Adaptations',
  'Professional Building Services',
] as const;

export type TradeCategory = (typeof TRADE_CATEGORIES)[number];

export const SUB_SKILLS: Record<TradeCategory, string[]> = {
  Tiling: [
    'Bathroom tiling', 'Kitchen tiling', 'Wall tiling', 'Floor tiling', 'Wet rooms', 'Mosaic tiling',
    'Large-format tiles', 'Porcelain', 'Ceramic', 'Natural stone', 'Outdoor tiling', 'Splashbacks',
    'Tile repairs', 'Regrouting', 'Waterproofing & tanking', 'Commercial tiling',
  ],
  Bathrooms: [
    'Full bathroom refits', 'Bathroom design', 'Showers', 'Wet rooms', 'Baths', 'Toilets', 'Basins',
    'Vanity units', 'Bathroom furniture', 'Bathroom tiling', 'Waterproofing & tanking', 'Accessible bathrooms',
  ],
  Kitchens: [
    'Full kitchen fitting', 'Kitchen renovations', 'Cabinet fitting', 'Worktops', 'Kitchen sinks',
    'Splashbacks', 'Appliance installation', 'Kitchen islands', 'Flat-pack kitchens', 'Bespoke kitchens',
  ],
  Plumbing: [
    'Leaks', 'Pipework', 'Taps', 'Sinks', 'Toilets', 'Showers', 'Baths', 'Radiators', 'Water tanks',
    'Outside taps', 'Emergency plumbing', 'Bathroom plumbing', 'Kitchen plumbing',
  ],
  'Heating & Gas': [
    'Boiler installation', 'Boiler servicing', 'Boiler repairs', 'Central heating', 'Radiators',
    'Gas appliances', 'Gas safety checks', 'Underfloor heating', 'Heating controls', 'Power flushing',
  ],
  Electrical: [
    'Domestic electrics', 'Full rewires', 'Partial rewires', 'Sockets', 'Lighting', 'Consumer units',
    'EICR testing', 'Fault finding', 'Outdoor electrics', 'Smoke alarms', 'Commercial electrics',
  ],
  'Renewables & EV': [
    'Home EV chargers', 'Commercial EV chargers', 'Solar panels', 'Battery storage', 'Heat pumps',
    'Solar servicing', 'Load management', 'Renewable energy systems',
  ],
  'Building & Extensions': [
    'General building', 'Single-storey extensions', 'Double-storey extensions', 'Rear extensions',
    'Side-return extensions', 'Wraparound extensions', 'Structural alterations', 'Open-plan conversions',
    'Property refurbishment', 'Renovations', 'Building repairs',
  ],
  Conversions: [
    'Loft conversions', 'Dormers', 'Hip-to-gable', 'Velux conversions', 'Garage conversions',
    'Basement conversions', 'Cellar conversions', 'Home office conversions', 'Annexes', 'Loft boarding & storage',
  ],
  'Brickwork & Masonry': [
    'Bricklaying', 'Blockwork', 'Garden walls', 'Repointing', 'Brick repairs', 'Stone walls',
    'Stone repairs', 'Natural stone', 'Chimney masonry', 'Restoration masonry',
  ],
  'Carpentry & Joinery': [
    'First fix carpentry', 'Second fix carpentry', 'Internal doors', 'External doors', 'Skirting & architraves',
    'Stairs', 'Bespoke cabinetry', 'Built-in storage', 'Wardrobes', 'Timber framing', 'Kitchen carpentry',
  ],
  'Plastering, Rendering & Dry Lining': [
    'Skimming', 'Plaster repairs', 'Ceilings', 'External rendering', 'Internal rendering', 'Plasterboard',
    'Stud walls', 'Partition walls', 'Dot and dab', 'Suspended ceilings', 'Office partitions',
  ],
  'Painting & Decorating': [
    'Interior painting', 'Exterior painting', 'Wallpapering', 'Woodwork painting', 'Feature walls',
    'Spray painting', 'Commercial decorating', 'Wallpaper removal', 'Surface preparation',
  ],
  'Roofing & Roofline': [
    'Pitched roofs', 'Flat roofs', 'Roof repairs', 'Roof leaks', 'Leadwork', 'Roof tiles', 'Slates',
    'Guttering', 'Downpipes', 'Fascias', 'Soffits', 'Roof cleaning',
  ],
  'Windows, Doors & Glazing': [
    'Windows', 'Front doors', 'French doors', 'Bi-fold doors', 'UPVC', 'Composite doors', 'Double glazing',
    'Glass replacement', 'Mirrors', 'Shopfront glass', 'Emergency glazing', 'Garage doors', 'Automated gates',
  ],
  'Flooring & Screeding': [
    'Laminate flooring', 'LVT', 'Vinyl flooring', 'Wood flooring', 'Carpet fitting', 'Carpet tiles',
    'Floor repairs', 'Floor preparation', 'Floor screeding', 'Self-levelling compound', 'Latex screed', 'DPM installation',
  ],
  'Landscaping & Gardening': [
    'Garden design', 'Garden maintenance', 'Lawns', 'Turfing', 'Artificial grass', 'Planting', 'Patios',
    'Raised beds', 'Garden clearance', 'Irrigation', 'Garden drainage',
  ],
  'Tree Surgery': [
    'Tree removal', 'Tree pruning', 'Crown reduction', 'Stump grinding', 'Hedge reduction',
    'Hedge trimming', 'Emergency tree work', 'Tree surveys',
  ],
  'Fencing & Decking': [
    'Timber fencing', 'Composite fencing', 'Fence repairs', 'Garden gates', 'Timber decking',
    'Composite decking', 'Balustrades', 'Privacy screening',
  ],
  'Driveways, Paving & Groundworks': [
    'Block paving', 'Tarmac', 'Resin driveways', 'Patios', 'Paths', 'Paving repairs', 'Excavation',
    'Foundations', 'Footings', 'Concrete slabs', 'Concrete bases', 'Site preparation', 'Mini piling', 'Underpinning',
  ],
  'Drainage & Sewage': [
    'Blocked drains', 'Drain repairs', 'CCTV surveys', 'Drain lining', 'Drain replacement', 'Soakaways',
    'Sewer connections', 'Septic tanks', 'Pump stations', 'Emergency drainage',
  ],
  'Damp Proofing & Insulation': [
    'Rising damp', 'Penetrating damp', 'Condensation', 'DPC installation', 'Basement waterproofing',
    'Tanking', 'Cavity wall insulation', 'Loft insulation', 'Internal wall insulation', 'External wall insulation',
  ],
  'Cladding & Exterior Finishes': [
    'Timber cladding', 'Composite cladding', 'UPVC cladding', 'Render systems', 'External wall finishes',
    'Facade repairs', 'Weatherproofing',
  ],
  'Chimneys & Fireplaces': [
    'Chimney repairs', 'Chimney repointing', 'Chimney removal', 'Chimney caps', 'Flue liners', 'Fireplaces',
    'Wood burners', 'Stove installation', 'Hearths',
  ],
  'Air Conditioning & Ventilation': [
    'Air conditioning installation', 'Air conditioning servicing', 'Air conditioning repairs', 'MVHR',
    'Extractor fans', 'Ventilation systems', 'Commercial ventilation',
  ],
  'Security, Smart Home & Locksmiths': [
    'CCTV', 'Alarms', 'Access control', 'Video doorbells', 'Smart home systems', 'Smart locks', 'Lock changes',
    'Emergency locksmith', 'Door entry systems', 'Automated gates',
  ],
  'Handyman & Property Maintenance': [
    'General repairs', 'Flat-pack assembly', 'Shelving', 'Curtain poles', 'Picture hanging', 'Minor carpentry',
    'Minor plumbing', 'Minor decorating', 'Property maintenance', 'Landlord maintenance',
  ],
  'Commercial Fit-Out & Access': [
    'Office fit-outs', 'Shop fit-outs', 'Retail fit-outs', 'Partitioning', 'Suspended ceilings', 'Raised floors',
    'Commercial doors', 'Access systems', 'Cat A fit-out', 'Cat B fit-out',
  ],
  'Demolition, Asbestos & Waste': [
    'Internal strip-out', 'Demolition', 'Site clearance', 'Licensed asbestos removal', 'Asbestos surveys',
    'Waste removal', 'Builders waste', 'Skip loading',
  ],
  'Cleaning, Exterior Care & Pest Control': [
    'End of tenancy cleaning', 'Deep cleaning', 'Builders cleans', 'Window cleaning', 'Gutter cleaning',
    'Pressure washing', 'Roof cleaning', 'Carpet cleaning', 'Pest control', 'Rodent control', 'Wasp nests',
  ],
  'Garden Buildings & Leisure': [
    'Garden rooms', 'Summerhouses', 'Sheds', 'Pergolas', 'Outdoor kitchens', 'Hot tub bases', 'Swimming pools',
    'Pool maintenance', 'Play areas',
  ],
  'Accessibility Adaptations': [
    'Grab rails', 'Ramps', 'Accessible bathrooms', 'Walk-in showers', 'Door widening', 'Threshold changes',
    'Stairlifts', 'Platform lifts', 'Home adaptations',
  ],
  'Professional Building Services': [
    'Planning drawings', 'Building regulations drawings', 'Planning applications', 'Architectural design',
    'Structural calculations', 'Steel beam design', 'Foundation design', 'Structural surveys',
    'Building surveys', 'Defect inspections', 'Snagging', 'Party wall', 'Condition reports',
  ],
};

export const PROPERTY_TYPES = ['House', 'Flat', 'Bungalow', 'Commercial', 'Other'] as const;
export const URGENCY_OPTIONS = ['Flexible', 'Within 1 month', 'Within 2 weeks', 'Urgent'] as const;
export const BUDGET_OPTIONS = ['Not sure / discuss', 'Under £500', '£500–£1,500', '£1,500–£5,000', '£5,000–£15,000', '£15,000+'] as const;
export const RADIUS_OPTIONS = ['5', '10', '15', '25', '50', '75'] as const;
export const TRADER_BIO_MIN_LENGTH = 50;

// Database values remain free/basic/featured for compatibility. Product names are Starter/Plus/Pro.
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Starter Free',
    shortName: 'Starter',
    price: '£0',
    categoryLimit: 2,
    monthlyMarketplaceQuotes: 0,
    features: ['Full profile setup', 'Browse marketplace jobs', 'External profile sharing'],
  },
  basic: {
    name: 'BuildPair Plus',
    shortName: 'Plus',
    price: '£19.99/mo',
    categoryLimit: 4,
    monthlyMarketplaceQuotes: 15,
    features: ['Public searchable profile', '15 open-marketplace offers per month', 'Direct quote requests', 'BuildPair messaging', 'AI-assisted replies and safety tools'],
  },
  featured: {
    name: 'BuildPair Pro',
    shortName: 'Pro',
    price: '£29.99/mo',
    categoryLimit: 6,
    monthlyMarketplaceQuotes: 35,
    features: ['Everything in Plus', '35 open-marketplace offers per month', 'Modest search boost', 'Advanced analytics', 'Priority new-job alerts'],
  },
} as const;
