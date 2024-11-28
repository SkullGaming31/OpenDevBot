import { Octokit } from '@octokit/core';
import fs from 'fs';

const octokit = new Octokit({ baseUrl: 'https://api.github.com', accessToken: 'your-github-access-token' });

const projectId = 'your-project-id';
const columnIds = {
	backlog: 'your-column-id-for-backlog',
	inProgress: 'your-column-id-for-in-progress',
	done: 'your-column-id-for-done',
};

fs.readFile('TODO.md', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}

	const tasks = data.split('\n').map((line) => {
		const match = line.match(/^\[(.)\] (.*)$/);
		if (match) {
			return {
				status: match[1],
				title: match[2],
			};
		}
		return null;
	}).filter((task) => task !== null);

	tasks.forEach((task) => {
		switch (task.status) {
			case 'x':
				moveTaskToColumn(task.title, columnIds.done);
				break;
			case '-':
				moveTaskToColumn(task.title, columnIds.inProgress);
				break;
			default:
				moveTaskToColumn(task.title, columnIds.backlog);
				break;
		}
	});
});

/**
 * Move a task to a given column.
 * @param {string} title the title of the task to move
 * @param {string} columnId the id of the column to move to
 */
function moveTaskToColumn(title, columnId) {
	octokit.issues.getAll({
		owner: 'your-username',
		repo: 'your-repo-name',
		state: 'open',
	}).then((response) => {
		const issue = response.data.find((issue) => issue.title === title);
		if (issue) {
			octokit.projects.updateCard({
				card_id: issue.number,
				project_id: projectId,
				column_id: columnId,
			});
		}
	});
}