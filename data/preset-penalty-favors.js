// Ported from handoff/preset-penalty-favors.md — default Favor suggestions per relationship category.
// Category ids match Pact.dc.html's CATEGORY_DEFS (couple/parentchild/house/work/bestie/other).
export const PRESET_FAVORS = {
  couple: [
    'Cook Dinner', 'Coffee Run', '30-Min Massage', 'Grocery Trip',
    'Pick Next TV Show / Movie (no complaining or scrolling for 45 mins)',
    'Breakfast in Bed', 'Full Aux Cord Control (next road trip)', 'Control of the Thermostat (unchallenged for 24 hours)',
  ],
  parentchild_parent_owes: [
    '+30 Mins Extra Screen Time', "Ice Cream Run (parent's treat)", 'Skip One Weekly Chore', "Pick Tonight's Dinner (even if it's pizza again)",
  ],
  parentchild_child_owes: [
    'Clean the Living Room', 'Empty the Dishwasher (without being asked twice)', 'Walk / Feed the Dog', 'Phone Stash (surrender phone 1 hour before bedtime)',
  ],
  house: [
    'Take Out the Trash & Recycling (for the rest of the week)', 'Deep Clean the Bathroom', 'Unload the Dishwasher',
    'Buy the Next Toilet Paper / Paper Towel Restock', 'Be the Designated Driver (next night out)', 'Pay $10 Toward Next Utility Bill',
  ],
  work: [
    'Fancy Coffee Run (lattes/boba on you)', 'Buy Lunch (food truck or fast casual)', 'Cover One Unpopular Task / Ticket',
    'Be the Designated Meeting Note-Taker', 'Public Slack/Teams Shoutout (compliment their brilliance in front of the team)', 'Refill the Breakroom Snacks',
  ],
  bestie: [
    'Buy the Next Round of Drinks / Coffee', 'Hype Man Duty (leave 3 overly enthusiastic comments on their latest post)',
    'Be the Designated Driver', 'Carry the Heavy Bags / Gear (next outing or trip)', 'Listen to a 15-Minute Rant (uninterrupted, full validation mode)',
    'Wear an Outfit of Their Choice (for 1 casual hangout)',
  ],
  other: ['Cook Dinner', 'Coffee Run', '30-Min Massage', 'Grocery Trip'],
};

export function defaultFavorsFor(categoryId) {
  if (categoryId === 'parentchild') return PRESET_FAVORS.parentchild_parent_owes;
  return PRESET_FAVORS[categoryId] || PRESET_FAVORS.other;
}
