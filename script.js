var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');
var XLSX = require('xlsx');

var DATABASE = "wftda";
var GAMECOL = "games_raw";
var SKATERCOL = "skaterGames";

//Utility Stuff
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
var Util = {
    "descendCol": function(col, fromRow, toRow){
        var cells = [];
        var iter = fromRow;
        while(iter <= toRow){
            var label = col + iter;
            cells.push({
                "label": col + iter,
                "column": col,
                "row": iter
            });
            iter++;
        }
        return cells;
    },
    "colNameToRight": function(col, n){
        var total = 0
        var place = 0;
        for(var i = col.length -1; i>=0; i--){
            var character = col[i];
            total += place > 0 ? (character.charCodeAt(0) - 64) * place : (character.charCodeAt(0) - 64);
            place += 26;
        }
        var dest = total + n;
        var digit1 = dest % 26;
        var digit2 = Math.floor(dest / 26.0)
        var newVal = (digit2 > 0 ? String.fromCharCode(digit2 + 64) : "") + String.fromCharCode(digit1 + 64);
        return newVal;
    },
    "safeVal": function(c){
        if(typeof c !== 'undefined' && c.v !== undefined) {
          return c.v;
        } else {
          return null;
        }
    },
    "safeXorNull": function(c){
        var val = this.safeVal(c);
        return val == null ? false : true;
    },
	"processArray": function(items, process) {
	    var todo = items.concat();

	    setTimeout(function() {
	        process(todo.shift());
	        if(todo.length > 0) {
	            setTimeout(arguments.callee, 25);
	        }
	    }, 25);
	}

};

var parseStatsBook = function(path, seasonNum) {

	var workbook = XLSX.readFile(path);

	var ibrfSheet = workbook.Sheets['IBRF'];
	var scoreSheet =  workbook.Sheets['Score'];
	var sumSheet =  workbook.Sheets['Bout Summary'];
	var penSheet = workbook.Sheets['Penalty Summary'];

	var homeTeam = ibrfSheet.B9.v.toUpperCase()
	var homeLeague = ibrfSheet.B8.v.toUpperCase()
	var visitingTeam = ibrfSheet.H9.v.toUpperCase()
	var visitingLeague = ibrfSheet.H8.v.toUpperCase()

	var game = {
		"meta": {
			"date" : ibrfSheet.B5.w,
			"venue" : ibrfSheet.B3.v,
			"city" : ibrfSheet.H3.v,
			"stPrv" : ibrfSheet.J3.v,
			"boutAB" : ibrfSheet.K3.v,
			"season": seasonNum
		},
		"outcome": {
			"homePointsTotal": ibrfSheet.C40.v,
			"visitingPointsTotal": ibrfSheet.I40.v,
			"homePenalties": ibrfSheet.E40.v,
			"visitingPenalties": ibrfSheet.K40.v,
			"jamCount": 0
		},
		"homeRoster": {
			"league": homeLeague,
			"team": homeTeam,
			"outcome": null,
			"points": ibrfSheet.C40.v,
			"penalties": ibrfSheet.E40.v,
			"skaters": {}
		},
		"visitingRoster": {
			"league": visitingLeague,
			"team": visitingTeam,
			"outcome": null,
			"points": ibrfSheet.I40.v,
			"penalties": ibrfSheet.K40.v,
			"skaters": {}
		},
		"jams": {
			"period1": {
				"home": [],
				"visiting": []
			},
			"period2": {
				"home": [],
				"visiting": []
			}
		}
	};
	game.homeRoster.outcome =  game.outcome.homePointsTotal > game.outcome.visitingPointsTotal ? "winner" : "loser";
	game.visitingRoster.outcome =  game.outcome.visitingPointsTotal > game.outcome.homePointsTotal ? "winner" : "loser";
	var gid = game.meta.date+"_"+game.homeRoster.league+"_"+game.homeRoster.team+"_"+game.visitingRoster.league+"_"+game.visitingRoster.team;
	game["_id"] = gid;


	var parseScore = function(team, period, startCol, fromRow, toRow){
		var hs = Util.descendCol(startCol, fromRow, toRow);
		var prevJamNum = null;
		for(var i in hs){
			var cell = hs[i];
			if(typeof scoreSheet[cell.label] !== 'undefined' && scoreSheet[cell.label].v !== undefined){
				var jamNum = Util.safeVal(scoreSheet[ Util.colNameToRight(cell.column, 0) + cell.row]);
				var jammerNum = Util.safeVal(scoreSheet[ Util.colNameToRight(cell.column, 1) + cell.row]);
				var lost = Util.safeXorNull(scoreSheet[ Util.colNameToRight(cell.column, 2) + cell.row]);
				var lead = Util.safeXorNull(scoreSheet[ Util.colNameToRight(cell.column, 3) + cell.row]);
				var call = Util.safeXorNull(scoreSheet[ Util.colNameToRight(cell.column, 4) + cell.row]);
				var inj = Util.safeXorNull(scoreSheet[ Util.colNameToRight(cell.column, 5) + cell.row]);
				var np = Util.safeXorNull(scoreSheet[ Util.colNameToRight(cell.column, 6) + cell.row]);
				var sp = jamNum == "SP";
				var passedTheStar = Util.safeVal(scoreSheet[ Util.colNameToRight(cell.column, 0) + (cell.row +2) ]) == "SP";
				var jamPoints = Util.safeVal(scoreSheet[ Util.colNameToRight(cell.column, 16) + cell.row]);
				var gameTotalPoints = Util.safeVal(scoreSheet[ Util.colNameToRight(cell.column, 17) + cell.row]);
		
				var j = {
					"jamNum": sp ? prevJamNum: jamNum,
					"jammerNum": String(jammerNum).toUpperCase(),
					"lost":lost,
					"lead":lead,
					"call":call,
					"inj":inj,
					"np":np,
					"pivotTurnedJammer": sp,
					"passedTheStar": passedTheStar,
					"jamPoints": jamPoints,
					"gameTotalPoints": gameTotalPoints
				}
				if(!(sp)) { 
					prevJamNum = jamNum; 
				}
			
				// log the jam
				game.jams[period][team].push(j);
				if(!sp) { 
					game.outcome.jamCount = game.outcome.jamCount + 1;
				}
			}
		}
	}
	parseScore("home", "period1", "A", 4, 78);
	parseScore("home", "period2", "A", 90, 164);
	parseScore("visiting", "period1", "T", 4, 78);
	parseScore("visiting", "period2", "T", 90, 164);
	game.outcome.jamCount = Math.floor(game.outcome.jamCount / 2);

	var homePenDict = {};
	var visitingPenDict = {};
	var safeNum = function(cell, offset) { 
		var num = Util.safeVal(penSheet[ Util.colNameToRight(cell.column, offset) + cell.row]); 
		return num !== null ? num : 0;
	};
	var parsePenalties= function(team, period, startCol, fromRow, toRow){
		var penDict = team == "home" ? homePenDict : visitingPenDict;
		var hs = Util.descendCol(startCol, fromRow, toRow);
		for(var i in hs){
			var cell = hs[i];
			if(typeof penSheet[cell.label] !== 'undefined' && penSheet[cell.label].v !== undefined){
				var skaterNum =  String(Util.safeVal(penSheet[cell.label])).toUpperCase();
				var pen = {
					BackBlock: safeNum(cell, 3),
					HighBlock: safeNum(cell, 4),
					LowBlock: safeNum(cell, 5),
					Elbows: safeNum(cell, 6),
					Forearms: safeNum(cell, 7),
					BlockWHead: safeNum(cell, 8),
					MultiPlayer: safeNum(cell, 9),
					OOBBlocking: safeNum(cell, 10),
					DirectionOfGameplay: safeNum(cell, 11),
					OutOfPlay: safeNum(cell, 12),
					CutTrack: safeNum(cell, 13),
					SkatingOOB: safeNum(cell, 14),
					IllegalProcedure: safeNum(cell, 15),
					Insubordination: safeNum(cell, 16),
					DelayOfGame: safeNum(cell, 17),
					Misconduct: safeNum(cell, 18),
					totalPenalties: safeNum(cell, 19)
				};
				penDict[skaterNum] = pen;
			}
		}
	};
	
	var isDoubleRowedSheet = Util.safeVal(penSheet["W94"]) == "Team Averages"; 
	
	if(isDoubleRowedSheet){
		parsePenalties("home","all","A",4,42);
		parsePenalties("visiting","all","A",53,91);
	} else {
		parsePenalties("home","all","A",4,23);
		parsePenalties("visiting","all","A",33,52);
	}




	var skaterPerformances = [];
	var safeNum = function(cell, offset) { 
		var num = Util.safeVal(sumSheet[ Util.colNameToRight(cell.column, offset) + cell.row]); 
		return num !== null ? num : 0;
	};
	var parseSkaters = function(team, period, startCol, fromRow, toRow){
		
		var hs = Util.descendCol(startCol, fromRow, toRow);
		for(var i in hs){
			var cell = hs[i];
			if(typeof sumSheet[cell.label] !== 'undefined' && sumSheet[cell.label].v !== undefined){
				var sp = {
					"_id": {
						"gid" : gid,
						"team": team,
						"skaterNum": String(Util.safeVal(sumSheet[cell.label])).toUpperCase(),
						"skaterName": safeNum(cell, 1),
					},
					"date" : ibrfSheet.B5.w,
					"season": seasonNum,
					"league": team == "home" ? game.homeRoster.league : game.visitingRoster.league,
					"team": team == "home" ? game.homeRoster.team : game.visitingRoster.team,
					"vsleague": team == "visiting" ? game.homeRoster.league : game.visitingRoster.league,
					"vsteam": team == "visiting" ? game.homeRoster.team : game.visitingRoster.team,
					"skaterNum": String(Util.safeVal(sumSheet[cell.label])).toUpperCase(),
					"skaterName": safeNum(cell, 1),
					"jamsPlayed": {
						"jammer": safeNum(cell, 2),
						"pivot": safeNum(cell, 3),
						"blocker": safeNum(cell, 4),
						"total": safeNum(cell, 5),
						"percentSkated": safeNum(cell, 6)
					},
					"points": safeNum(cell, 7),
					"pointsPerJam": safeNum(cell, 8),
					"leadJammer": {
						"lost": safeNum(cell, 9),
						"lead": safeNum(cell, 10),
						"call": safeNum(cell, 11),
						"inj": 0,
						"np": safeNum(cell, 12),
						"percentLead": safeNum(cell, 13),
						"diffWhenLead": safeNum(cell, 14),
						"avgDiffWhenLead": safeNum(cell, 15),
					},
					"differentials": {
						"pointsFor": safeNum(cell, 16),
						"pointsAgainst": safeNum(cell, 17),
						"totalDiff": safeNum(cell, 18),
						"avgDiff": safeNum(cell, 25),
						"jammerDiff": safeNum(cell, 19),
						"avgJammerDiff": safeNum(cell, 20),
						"pivotDiff": safeNum(cell, 21),
						"avgPivotDiff": safeNum(cell, 22),
						"blockerDiff": safeNum(cell, 23),
						"avgBlockerDiff": safeNum(cell, 24)
					},
					"penalties": {}
				};
				
				var penDict = team == "home" ? homePenDict : visitingPenDict;
				var skaterPens = penDict[sp["_id"].skaterNum];
				for(i in skaterPens){
					sp.penalties[i] = skaterPens[i];
				}
				//if(sp._id.skaterNum == "1231") { console.log(sp);}
			
				var roster = team == "home" ? game.homeRoster.skaters : game.visitingRoster.skaters;
				roster[sp.skaterNum] = {
					"skaterNum": sp.skaterNum,
					"skaterName": sp.skaterName,
					"points": sp.points,
					"penalties": sp.penalties.totalPenalties
				}
			
				var p1Jams = team == "home" ? game.jams.period1.home : game.jams.period1.visiting;
				var p2Jams = team == "home" ? game.jams.period2.home : game.jams.period2.visiting;
				for(var i in p1Jams) {
					if(p1Jams[i].inj) {
						sp.leadJammer.inj = sp.leadJammer.inj + 1;
					}
				}
				for(var i in p2Jams) {
					if(p2Jams[i].inj) {
						sp.leadJammer.inj = sp.leadJammer.inj + 1;
					}
				}
				sp.outcome = team == "home" ? game.homeRoster.outcome : game.visitingRoster.outcome;
			
				skaterPerformances.push(sp);
			}
		}
	};
	parseSkaters("home","all","A",6,25);
	parseSkaters("visiting","all","A",28,47);




	if(true){
		MongoClient.connect("mongodb://localhost:27017/"+DATABASE, function(err, db) {
		  if(err) { return console.dir(err); }
		  var games = db.collection(GAMECOL);
		  var sp = db.collection(SKATERCOL);
		  games.save(
			game, 
			function(err, result){
				if(err === null){
					console.log("Inserted game: " + game["_id"]);
					Util.processArray( skaterPerformances, function(performance) {
						sp.save( performance, function(err, result){
							if(err === null){
								console.log("Inserted sp: "+ performance["_id"]["skaterNum"]);
							} else {
								console.log(err);
							}
						})
					});
				
				} else {
					console.log(err);
				}
			});
		});
	} else {
		console.log(game);
	}
};


var files = [];
var pathArray = fs.readdirSync(".");
for( var i in pathArray){
	var path = pathArray[i]; 
	if(path.endsWith(".xlsx")) {
		console.log("Parsing: " + path);
		parseStatsBook(path, "DCRG_Season8");
	}
}




