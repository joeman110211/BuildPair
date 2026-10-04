export type JobReadinessInput = {
  directRequest: boolean;
  category?: string;
  propertyType?: string;
  postcode: string;
  urgency?: string;
  budgetRange?: string;
  title: string;
  description: string;
  photos: string[];
};

export type JobReadinessItem = { key:string; label:string; complete:boolean };

export function jobReadiness(input: JobReadinessInput) {
  const items: JobReadinessItem[] = [
    { key:'trade', label:'Trade selected', complete:Boolean(input.category) },
    { key:'description', label:'Clear job description', complete:input.description.trim().length >= 60 },
    { key:'location', label:'Job area', complete:input.postcode.trim().length >= 5 },
    ...(input.directRequest ? [] : [
      { key:'property', label:'Property type', complete:Boolean(input.propertyType) },
      { key:'title', label:'Clear job title', complete:input.title.trim().length >= 5 },
      { key:'timing', label:'Timing', complete:Boolean(input.urgency) },
      { key:'budget', label:'Budget range', complete:Boolean(input.budgetRange) },
    ]),
    { key:'photos', label:'Useful photos', complete:input.photos.length >= 2 },
  ];
  const essentialKeys = new Set(['trade','description','location', ...(input.directRequest ? [] : ['property','title','timing','budget'])]);
  const essentialComplete = items.filter((item) => essentialKeys.has(item.key)).every((item) => item.complete);
  const complete = items.filter((item) => item.complete).length;
  return {
    items,
    complete,
    total: items.length,
    percent: Math.round((complete / items.length) * 100),
    essentialComplete,
  };
}
