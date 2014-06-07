//skaterSeasons 
var c = db.skaterGames.aggregate([ 
	{ $group: { _id: { 
		skaterNum: "$skaterNum", 
		season: "$season",
		team: "$team", 
		league: "$league"}, 
		
		skaterName:{$first:"$skaterName"},
		games:{$sum:1}, 
		points:{$sum:"$points"},
		jamsPlayedTotal:{ $sum: "$jamsPlayed.total"},
		jamsPlayedJammer:{$sum:"$jamsPlayed.jammer"},
		jamsPlayedPivot:{$sum:"$jamsPlayed.pivot"},
		jamsPlayedBlocker:{$sum:"$jamsPlayed.blocker"},
		percentSkated: {$avg: "$jamsPlayed.percentSkated"},
		percentLead: {$avg: "$leadJammer.percentLead"},
		avgPointsFor: {$avg: "$differentials.pointsFor"},
		avgPointsAgainst: {$avg: "$differentials.pointsAgainst"},
		avgAvgJammerDiff: {$avg: "$differentials.avgJammerDiff"},
		avgAvgPivotDiff: {$avg: "$differentials.avgPivotDiff"},
		avgAvgBlockerDiff: {$avg: "$differentials.avgBlockerDiff"},
		"totalPenalties" : {$sum: "$penalties.totalPenalties"},
		"backBlock" : {$sum: "$penalties.BackBlock"},
		"highBlock" : {$sum: "$penalties.HighBlock"},
		"lowBlock" : {$sum: "$penalties.LowBlock"},
		"elbows" : {$sum: "$penalties.Elbows"},
		"forearms" : {$sum: "$penalties.Forearms"},
		"blockWHead" : {$sum: "$penalties.BlockWHead"},
		"multiPlayer" : {$sum: "$penalties.MultiPlayer"},
		"OOBBlocking" : {$sum: "$penalties.OOBBlocking"},
		"directionOfGameplay" : {$sum: "$penalties.DirectionOfGameplay"},
		"outOfPlay" : {$sum: "$penalties.OutOfPlay"},
		"cutTrack" : {$sum: "$penalties.CutTrack"},
		"skatingOOB" : {$sum: "$penalties.SkatingOOB"},
		"illegalProcedure" : {$sum: "$penalties.IllegalProcedure"},
		"insubordination" : {$sum: "$penalties.Insubordination"},
		"delayOfGame" : {$sum: "$penalties.DelayOfGame"},
		"misconduct" : {$sum: "$penalties.Misconduct"},
		"penPerG" : {$avg: "$penalties.totalPenalties"}
		}
	}
]);
while(c.hasNext()){  
	var ss = c.next();
	ss.penPerJam = ss.totalPenalties / ss.jamsPlayedTotal;
	ss.pointPerJam = ss.points / ss.jamsPlayedJammer;
	ss.pointPerGgame = ss.points / ss.games;
	db.skaterSeasons.save(ss);
}

// teamSeasons
	//	

	var winRecord = {}
	var outcomes= db.games_raw.aggregate([
		{ $group: { _id: {  team: "$homeRoster.team" },
			wins: {$sum: { $cond: {if: {$eq:["$homeRoster.outcome","winner"]}, then: 1, else: 0}}},
			points: {$sum: "$homeRoster.points"},
			pointsAgainst: {$sum: "$visitingRoster.points"},
			penalties: {$sum: "$homeRoster.penalties"}
		}},
		{ $project: { _id: 0, team: "$_id.team", wins:1, points:1, pointsAgainst:1, penalties:1 }}
	]).toArray();
	
	var outcomes2 = db.games_raw.aggregate([
		{ $group: { _id: {  team: "$visitingRoster.team" },
			wins: {$sum: { $cond: {if: {$eq:["$visitingRoster.outcome","winner"]}, then: 1, else: 0}}},
			points: {$sum: "$visitingRoster.points"},
			pointsAgainst: {$sum: "$homeRoster.points"},
			penalties: {$sum: "$visitingRoster.penalties"}
		}},
		{ $project: { _id: 0, team: "$_id.team", wins:1, points:1, pointsAgainst:1, penalties:1 }}
	]).toArray();
	var allOutcomes = outcomes.concat(outcomes2);
	for(i in allOutcomes){
		var outcome = allOutwcomes[i];
		if(winRecord[outcome.team]) {
			winRecord[outcome.team].wins += outcome.wins;
			winRecord[outcome.team].points += outcome.points;
			winRecord[outcome.team].pointsAgainst += outcome.pointsAgainst;
			winRecord[outcome.team].penalties += outcome.penalties;
		} else {
			winRecord[outcome.team] = {
				team : outcome.team,
				wins : outcome.wins,
				points: outcome.points,
				pointsAgainst: outcome.pointsAgainst,
				penalties: outcome.penalties
			}
		}
	}
	//printjson(winRecord);
	
	var c = db.skaterGames.aggregate([ 
		{$group:{_id:{"team":"$team", "league":"$league"},
			jamsTotal: {$sum: "$jamsPlayed.jammer"}
		}}
	]);
	while(c.hasNext()){
		team = c.next();
		team.wins = winRecord[ team._id.team ].wins;
		team.points = winRecord[ team._id.team ].points;
		team.pointsAgainst = winRecord[ team._id.team ].pointsAgainst;
		team.penalties = winRecord[ team._id.team ].penalties;
		printjson(team);
	}
	




db.games_raw.aggregate([
	{$project}
]);


	
var c = db.games_raw.aggregate([ 
	
	}
]);

var team = "CHERRY BLOSSOM BOMBSHELLS";
db.games_raw.find( { $or: [{"homeRoster.team" : team},{"visitingRoster.team":team}] }, {_id: 1});



var d = db.games.aggregate([ 
	{ $group: { _id: { 
		teamA: "$visitingRoster.team"
		},
		wins: {$sum: { $cond: {if: {$eq:["$visitingRoster.outcome","winner"]}, then: 1, else: 0}}}
		}
	}
]);

while(d.hasNext()){
	printjsononeline( d.next() );
}


