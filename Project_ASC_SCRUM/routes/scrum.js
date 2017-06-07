
/*
 * GET users listing.
 */
var mysql = require('mysql');
var client = mysql.createConnection({
   user : 'root',
   password : 'root',
   database : 'project_asc'
});

exports.taskboard = function(request, response){
	client.query('select scrum_no from scrum where project_list_no = ?', [request.params.project_list_no]
	,function (error0, scrum){
		client.query('select project_release_no from project_release where project_list_no = ?', [request.params.project_list_no]
			,function (error1, release){
			client.query('select * from sprint where scrum_no = ?', scrum[0].scrum_no
				,function (error2, sprintResults){
				client.query('select max(sprint_no) as max from sprint where scrum_no = ?', scrum[0].scrum_no
					,function (error3, sprintmax){
					if(request.params.sprint_no == 0){
						response.render('scrum/taskBoard', {
							project_list_no : request.params.project_list_no,
							project_release_no : release[0].project_release_no,
							scrum_no : scrum[0].scrum_no,
							sprintData : sprintResults,
							maxsprint : sprintmax[0].max,
							currentsprint : 0,
							Max : sprintmax[0].max
						});
					} else {
						response.render('scrum/taskBoard', {
							project_list_no : request.params.project_list_no,
							project_release_no : release[0].project_release_no,
							scrum_no : scrum[0].scrum_no,
							sprintData : sprintResults,
							maxsprint : 0,
							currentsprint : request.params.sprint_no,
							Max : sprintmax[0].max
						});
					}
				});
			});
		});
	});
};
exports.releasePlanning = function(request, response){
	client.query('select project_join_no from project_list where project_list_no = ?',[request.params.project_list_no]
	, function (error0, join){
		client.query('select user_no from project_join_list where project_join_no = ?',[join[0].project_join_no]
			,function (errors, masterId){
			client.query('select scrum_no from scrum where project_list_no = ?', [request.params.project_list_no]
				,function (errors, scrum){
				client.query('select * from category where scrum_no = ?',  scrum[0].scrum_no
					,function (error, categoryResult){
					client.query('select project_release_no from project_release where project_list_no', [request.params.project_list_no]
						,function (erro,release){
						client.query('select * from user_story where project_release_no = ?', release[0].project_release_no 
							,function (error, storyResult){
								response.render('scrum/releasePlanning', {
									project_list_no : request.params.project_list_no,
									project_join_no : join[0].project_join_no,
									project_release_no : release[0].project_release_no,
									scrum_no : scrum[0].scrum_no,
									storyData : storyResult,
									categoryData : categoryResult,
									masterId : masterId[0].user_no 
								});
							});
					});
				});
			});
		});
});
};