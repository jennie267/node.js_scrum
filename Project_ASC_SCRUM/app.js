/**
 * 외부모듈
 */
var express = require('express')
 , session = require('express-session')
 , path = require('path')
 , favicon = require('serve-favicon')
 , logger = require('morgan')
 , cookieParser = require('cookie-parser')
 , bodyParser = require('body-parser')
 , mysql = require('mysql')
 , http = require('http')
 , ejs = require('ejs')
 , app = express()
 , server = http.createServer(app)
 , io = require('socket.io')(server)
 , sassMiddleware = require('node-sass-middleware')
 , fs = require("fs")
 , readline = require("readline")
 , scrum = require('./routes/scrum.js');


var client = mysql.createConnection({
   user : 'root',
   password : 'root',
   database : 'project_asc'
});

var port = process.env.PORT || 4567;

// all environments
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended : false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'public')));

app.get('/taskboard/:project_list_no/:sprint_no', scrum.taskboard);
app.get('/releasePlanning/:project_list_no', scrum.releasePlanning);

io.sockets.on('connection', function (socket){
	/** 스크럼 */
	//Sprint Srt
	//스프린트 추가 및 그전 스프린트 종료
	socket.on('sprintAdd', function (data){
		client.query('select max(sprint_no) as mad from sprint where scrum_no = ?', data.scrum_no
			,function (error, results){
			client.query('update sprint set end_date = now() where sprint_no = ?'
					, results[0].mad);
		});
		client.query('INSERT INTO sprint(sprint_no, scrum_no, start_date) VALUES (null, ?, now())', data.scrum_no);
		client.query('select max(sprint_no) as mad from sprint where scrum_no = ?', data.scrum_no
			,function (error1, result){
				client.query('update sprint_back_log set sprint_no = ? where status < 2 and sprint_no = ?', [result[0].mad, data.sprint_no]);
		});
	});
	//스프린트 제거
	socket.on('sprintRemove', function (data){
		client.query('delete sprint where scrum_no = ?', data.scrum_no);
		client.query('insert into sprint (sprint_no, scrum_no, start_date) values(null, ?, now())', data.scrum_no);
	});
	//스프린트 날짜 보기
	socket.on('sprintDetail', function (data){
		client.query('select * from sprint where sprint_no = ?', data.sprint_no
			,function (error, results){
			io.sockets.emit('sprintDetail', {
				sprint : results
			});
		});
	});
	//Sprint Fin
	
	//Category Srt
	//카테고리 리스트
	socket.on('categoryList', function (data){
		client.query('select * from category where scrum_no = ?', data.scrum_no 
			,function (error, results){
			io.sockets.emit('cateList', {
				data : results
			});
		});
	});
	//카테고리 추가
	socket.on('categoryAdd', function (data){
		client.query('insert into category (category_no, project_release_no, scrum_no, title) values(null,?,?,?)'
			, [data.project_release_no, data.scrum_no, data.title]);
		
	});	
	//카테고리 삭제
	socket.on('categoryDelete', function (data){
		client.query('delete from category where category_no = ?'
				, data.category_no);
	});
	//카테고리 수정
	socket.on('categoryEdit', function (data){
		client.query('update category set title = ? where category_no = ?'
				, [data.title, data.category_no]);
	});
	//카테고리 정보
	socket.on('cateDetail', function (data){
		client.query('select * from category where category_no = ?'
				, data.category_no, function (error, results){
					io.sockets.emit('StoryCate', {
						data : results
					});
				});
	});
	//Category Fin
	
	//UserStory Srt ->> 스토리
	//스토리 리스트
	socket.on('StoryList', function (data){
		client.query('select * from user_story where project_release_no = ?', data.project_release_no 
			,function (error, results){
				io.sockets.emit('StoryList', {
					data : results
				});
		});
	});
	//스토리 추가
	socket.on('StoryAdd', function (data){
		client.query(
		'INSERT INTO user_story(user_story_no, project_release_no, category_no, title, as_a, i_want, so_that, priority, working_time) values(null, ?, ?, ?, ?, ?, ?, ?, null)' 
			,[data.project_release_no, data.category_no, data.title, data.as_a,
			  data.i_want, data.so_that, data.priority]);
	});
	//스토리 삭제
	socket.on('StoryDelete', function (data){
		client.query(
		'delete from user_story where user_story_no = ?'		
			, data.user_story_no);
	});
	//스토리 정보
	socket.on('StoryDetail', function (data){
		client.query('select * from user_story where user_story_no = ?'
			, data.user_story_no, function (error, results){
				io.sockets.emit('StoryDetail', {
					data : results
				});
			});
	});
	//수정용 ->> 스토리 불러오기
	socket.on('ModifyStoryLoad', function (data){
		client.query('select * from user_story where user_story_no = ?'
				, data.user_story_no, function (error, results){
					io.sockets.emit('ModifyStoryLoad', {
						data : results
					});
				});
	});
	//수정용 ->> 스토리 수정
	socket.on('StoryModify', function (data){
		client.query('update user_story set category_no = ?, title = ?, as_a = ?, i_want = ?, so_that = ?, priority = ? where user_story_no = ?'
			, [data.category_no, data.title, data.as_a, 
				data.i_want, data.so_that, data.priority, data.user_story_no]);
	});
	//투두등록용 ->> 스토리 정보
	socket.on('DoDetail_UserStory', function (data){
		client.query('select * from user_story where user_story_no = ?'
				, data.user_story_no, function (error, results){
					io.sockets.emit('DoDetail_UserStory', {
						data : results
					});
				});
	});
	//투두수정용 ->> 스토리 정보
	socket.on('DoModify_UserStory', function (data){
		client.query('select * from user_story where project_release_no = ?', data.project_release_no 
				,function (error, results){
					io.sockets.emit('DoModify_UserStory', {
						data : results
					});
			});
	});
	//스토리 시간 등록
	socket.on('StorySetScore', function (data){
		client.query('update user_story set working_time = ? where user_story_no = ?'
				, [data.working_time, data.user_story_no]);
	});
	//UserStory Fin
	
	//Todo Srt
	//투두 리스트
	socket.on('todoList', function (data){
		client.query('select * from sprint_back_log where sprint_no = ?' 
			,data.sprint_no,	function (error, results){
			io.sockets.emit('todoList', {
				data : results
			});
		});
	});
	//투두 등록
	socket.on('DoAdd', function (data){
		client.query(
		'INSERT INTO sprint_back_log(sprint_back_log_no, sprint_no, user_story_no, user_no, content, status) values(null, ?, ?, ?, ?, 0)' 
			,[data.sprint_no, data.user_story_no, data.user_no, 
			  data.content]);
	});
	//투두 삭제
	socket.on('DoDelete', function (data){
		client.query(
		'delete from sprint_back_log where sprint_back_log_no = ?'		
			, data.sprint_back_log_no);
	});
	//투두 정보
	socket.on('DoDetail', function (data){
		client.query('select * from sprint_back_log where sprint_back_log_no = ?'
			, data.sprint_back_log_no, function (error, results){
				io.sockets.emit('DoDetail', {
					data : results
				});
			});
	});
	//투두수정 불러오기
	socket.on('DoModifyLoad', function (data){
		client.query('select * from sprint_back_log where sprint_back_log_no = ?'
				, data.sprint_back_log_no, function (error, results){
					io.sockets.emit('DoModifyLoad', {
						data : results
					});
				});
	});
	//투두 수정
	socket.on('DoModify', function (data){
		client.query('update sprint_back_log set user_story_no = ?, user_no = ?, content = ?, status = ? where sprint_back_log_no = ?'
			, [data.user_story_no, data.user_no, 
				data.content, data.status, data.sprint_back_log_no]);
	});
	//버튼으로 투두 상태 변경
	socket.on('ThrowOut', function (data){
		client.query('update sprint_back_log set status = ? where sprint_back_log_no =?'
				, [data.status, data.sprint_back_log_no]);
	});
	//Todo Fin
	//User Srt
	//유저 리스트
	socket.on('DoUserList', function (data){
		client.query('select project_join_no from project_list where project_list_no = ?',[data.project_list_no]
			, function (error0, join){
			client.query('select user_no from project_join_list where project_join_no = ? and status = 0',[join[0].project_join_no]
				,function (error1, user){
				client.query('select * from users', function (error2, list){	
					io.sockets.emit('DoUser', {
						list : list,
						user : user
					});
				});
			});
		});
	});
	//작업자 정보
	socket.on('DoDetail_Worker', function (data){
		client.query('select * from users where user_no = ?'
				, data.user_no, function (error, results){
			io.sockets.emit('DoDetail_Worker', {
				data : results
			});
		});
	});
	//투두수정용 ->> 작업자
	socket.on('DoModify_Worker', function (data){
		client.query('select project_join_no from project_list where project_list_no = ?',[data.project_list_no]
			, function (error0, join){
			client.query('select user_no from project_join_list where project_join_no = ? and status = 0',[join[0].project_join_no]
				,function (error1, user){
				client.query('select * from users', function (error2, list){	
					io.sockets.emit('DoModify_Worker', {
					list : list,
					user : user
					});
				});
			});
		});
	});
	//User Fin
	//Poker Srt
	//포커 점수 등록
	socket.on('PokerAdd', function (data){
		client.query('insert INTO poker(poker_no, user_story_no, user_no, score) VALUES (null, ?, ?, ?)'
				, [data.user_story_no, data.user_no, data.score]);
	});
	//포커 정보
	socket.on('PokerDetail', function (data){
		client.query('select * from poker where user_story_no = ?'
				, data.user_story_no, function (error, results){
					io.sockets.emit('PokerDetail', {
						data : results
					});
				});
	});
	//Poker Fin
	//Project_Join_List Srt
	//참가 목록
	socket.on('Join_List', function (data){
		client.query('select count(user_no) as count from project_join_list where project_join_no = ?'
				, data.project_join_no, function (error, count){
					client.query('select count(user_no) as Vote from poker where user_story_no = ? and score >0'
							,data.user_story_no, function (error, vote){
								client.query('select * from poker where user_story_no = ? and score >0'
									,data.user_story_no, function (error, score){
										io.sockets.emit('Join_List', {
											count : count,
											vote : vote,
											score : score
										});
								});	
					});
		});
	});
	//Project_Join_List Fin
	/** 스크럼 */
});

server.listen(port,function(){
	console.log("connect server : " + port);
});
