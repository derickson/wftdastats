
var c = db.skaterSeasons.find();
var header = false;
while(c.hasNext()){
	var s = c.next();
	var line = ""
	if(!header){
		var headerLine = ""
		for(i in s){
			if(i == "_id"){
				for(j in s[i]){
					headerLine += j + ",";
				}
			} else{
				headerLine += i + ","
			}
		}
		header = true;
		print(headerLine);
	}
	
	for(i in s){
		if(i == "_id"){
			for(j in s[i]){
				line += s[i][j] + ",";
			}
		} else{
			line += s[i] + ","
		}
	}
	print(line);
}