const pirateNames = [
	'Blackbeard',
	'Calico Jack',
	'Anne Bonny',
	'Jack Sparrow',
	'Kidd',
	'Long John Silver',
	'Redbeard',
	'Morgan',
	'Black Bart',
	'Grace O\'Malley',
	'Flint',
	'Hook',
	'Black Sam',
	'Mary Read',
	'Edward Teach',
	'Henry Morgan',
	'Jean Lafitte',
	'William Kidd',
	'Charles Vane',
	'Ragnar the Red'
];

const pirateRoles = [
	'Captain',
	'Quartermaster',
	'Navigator',
	'Helmsman',
	'Boatswain',
	'Gunner',
	'Deckhand',
	'Lookout',
	'Cook',
	'Sailing Master',
	'Ship\'s Surgeon',
	'Boarding Party'
];

export function generateRandomPirateName() {
	const randomNameIndex = Math.floor(Math.random() * pirateNames.length);
	const randomRoleIndex = Math.floor(Math.random() * pirateRoles.length);
  
	const randomName = pirateNames[randomNameIndex];
	const randomRole = pirateRoles[randomRoleIndex];
  
	return {
		name: randomName,
		role: randomRole
	};
}