var canvas;
var ctx;
var FPS = 30;
var image = new Image()
var current_time;
var last_update;
var t = 0.0;
var dt = 0.1;
var accum = 0.0;
var flipClock = null;

//NOT MY CODE! Found on a link @ html5rocks, as the requestAnimationFrame method is only available in beta channels atm
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function(/* function */ callback, /* DOMElement */ element){
			window.setTimeout(callback, 1000 / 60);
			};
})();
//END OF NOT MY CODE
function start()
{
	canvas = document.getElementById("drawContext");
	ctx  = canvas.getContext("2d");
	var date = new Date();
	current_time = date.getTime();
	//flipClock = new FlipClock(0,500);
	flipClock = new CountDownClock(2013,12,21,00,00,00,0,100);
	window.requestAnimFrame(main_loop);
}


function draw()
{
	flipClock.draw(ctx);
}

function createFlipDigit(x,y,initialValue,displayValue,maxValue)
{
	var statisTopFlipElement = new FlipElement(x,y,100,100,"nums/"+(displayValue % 10)+"_top.png","top");
	var statisBottomFlipElement = new FlipElement(x,y + 102,100,100,"nums/"+(displayValue % 10)+"_bot.png","bottom");
	var topFlipElement = new FlipElement(x,y,100,100,"nums/"+(displayValue % 10)+"_top.png","top");
	topFlipElement.lerp = new Interpolator(100,0,1.5);
	var bottomFlipElement = new FlipElement(x,y+102,100,0,"nums/"+(displayValue % 10)+"_bot.png","bottom");
	bottomFlipElement.lerp = new Interpolator(0,100,1.5);
	return new FlipDigit(statisTopFlipElement,statisBottomFlipElement,topFlipElement,bottomFlipElement,initialValue,displayValue,maxValue);

}


function Interpolator(start,end,duration)
{
	this.start = start;
	this.last_value = start;
	this.end = end;
	this.duration = duration;
	this.elapsed_time = 0;
	this.time_start = null;
}

Interpolator.prototype.setTimeStart = function(time)
{
		this.time_start = time;
};

Interpolator.prototype.hasTimeStart = function()
{
		return this.time_start != null;
};

Interpolator.prototype.isPassDuration= function(t)
{
		return this.elapsed_time > this.duration;
};

Interpolator.prototype.isComplete = function()
{
		return (this.duration - this.elapsed_time) <= 0.0 && this.elapsed_time > 0;
};

Interpolator.prototype.inProgress = function()
{
	return this.last_value != this.end;
}

Interpolator.prototype.reset = function()
{
		this.last_value = this.start;
		this.time_start = null;
		this.elapsed_time = 0;
};

Interpolator.prototype.linear = function(t)
{
		if(this.hasTimeStart() == false)
			this.time_start = t;
		this.elapsed_time = (t - this.time_start);
		if(this.isComplete() || this.isPassDuration())
			return this.end;
		this.last_value = this.start + (this.end - this.start) * (this.elapsed_time / this.duration);
		return this.last_value;
};

function FlipElement(x,y,width,height,imagePath,side)
{
	this.init_x = x;
	this.init_y = y;
	this.x = x;
	this.y = y;
	this.image = new Image();
	this.image.src = imagePath;
	this.image.id = "id"+x+y;
	this.width = width;
	this.height = height;
	this.last_flip_start = null;
	this.lerp = null;
	this.side = side;
	this.flip = false;
}

FlipElement.prototype.setLinearInterpolator = function (linearInterpolator){
	this.lerp = linearInterpolator;
}

FlipElement.prototype.isTop = function()
{
	return this.side === "top";
}

FlipElement.prototype.isBottom = function()
{
	return this.side === "bottom";
}


FlipElement.prototype.isFlipInProgress = function()
{
	return this.lerp.inProgress() && this.flip == true;
}

FlipElement.prototype.hasFlipped = function()
{
	return this.lerp.isComplete();
}

FlipElement.prototype.startFlip = function()
{
	this.flip = true;
}

FlipElement.prototype.mustFlip = function()
{
	if(this.lerp != null && this.last_flip_start != null && this.flip == true)
		return this.lerp.isComplete() == false;
	else
		return false;
}

FlipElement.prototype.doTopFlip = function(t)
{
	if(this.flip == false)
		return;
	if(this.lerp.isPassDuration() || this.lerp.isComplete())
	{
		this.height = this.lerp.end;
		this.flip = false;
	}
	else
	{
		var lerp = this.lerp.linear(t);
		this.y = this.y + (this.height - lerp);
		this.height = lerp;
	}
}

FlipElement.prototype.doBottomFlip = function(t)
{
	if(this.flip == false)
		return;
	if(this.lerp.isPassDuration(t) || this.lerp.isComplete())
	{
		this.flip = false;
		this.height = this.lerp.end;
	}
	else
	{
		this.height = this.lerp.linear(t);
	}
}

FlipElement.prototype.reset = function()
{
	this.last_flip_start = null;
	this.flip = false;
	if(this.lerp != null)
	{
		this.lerp.reset();
		this.y = this.init_y;
		this.height = this.lerp.start;
	}
}

FlipElement.prototype.update = function(t)
{
		if(this.last_flip_start == null)
			this.last_flip_start = t;
		if(this.isTop() && this.lerp.isComplete() == false)
			this.doTopFlip(t - this.last_flip_start);
		else if (this.isBottom() && this.lerp.isComplete() == false )
			this.doBottomFlip(t - this.last_flip_start);
}

FlipElement.prototype.draw = function(ctx)
{
	ctx.drawImage(this.image,this.x,this.y,this.width,this.height);
}


function FlipDigit(staticTopEl,staticBotEl,topElement, bottomElement,initialValue,displayValue,maxDisplayValue)
{
	this.staticTopEl = staticTopEl;
	this.staticBotEl = staticBotEl;
	this.topElement = topElement;
	this.bottomElement = bottomElement;
	this.value = initialValue;//a value that can be anything ... negative or postive
	this.valueImageIndex = displayValue % 10;
	this.on_max_reached = function() {};
	this.numberImagePrefix = [];
	var i = 0;
	for(i = 0; i < maxDisplayValue; i++)
	{
		this.numberImagePrefix.push("nums/" + (i % 10) );
	}
}

FlipDigit.prototype.setupImages = function(index)
{
	if(this.numberImagePrefix[index] != null)
	{
		this.topElement.image.src = this.staticTopEl.image.src;
		this.staticTopEl.image.src = this.numberImagePrefix[index] + "_top.png";
		this.bottomElement.image.src = this.numberImagePrefix[index] + "_bot.png";
	}
}

FlipDigit.prototype.setValue = function(v)
{
	this.value = Math.abs(v);
}

FlipDigit.prototype.getX = function()
{
	return this.staticTopEl.x;
}

FlipDigit.prototype.getY = function()
{
	return this.staticTopEl.y;
}

FlipDigit.prototype.getHeight = function()
{
	return this.staticTopEl.height + this.staticBotEl.height;
}

FlipDigit.prototype.getWidth = function()
{
	return this.staticTopEl.width;
}


FlipDigit.prototype.setMaxReachedCallBack = function(callback)
{
	if(callback && typeof(callback) === "function")
	{
		this.on_max_reached = callback;
	}
}

FlipDigit.prototype.getValue = function()
{
	return this.value;
}


FlipDigit.prototype.increment = function()
{
	this.value = this.value + 1;
	if(this.valueImageIndex + 1 == this.numberImagePrefx.length)
	{
		this.on_max_reached();
	}
	this.valueImageIndex = this.valueImageIndex + 1 % this.numberImagePrefix.length;
	this.setupImages(this.valueImageIndex);
	this.startElementFlip();
}

FlipDigit.prototype.decrement = function()
{
	if(this.value - 1 < 0)
		return;
	else
	{
		if(this.valueImageIndex % 10 == 0)
			this.on_max_reached();
		this.value = this.value - 1;
		this.valueImageIndex = this.value % (this.numberImagePrefix.length);
		this.setupImages(this.valueImageIndex);
		this.startElementFlip();
	}
}

FlipDigit.prototype.startElementFlip = function()
{
	this.topElement.reset();
	this.topElement.startFlip();
	this.bottomElement.reset();
}

FlipDigit.prototype.update = function(t)
{
	if(this.topElement.hasFlipped() == false)
	{
		this.topElement.update(t);
		if(this.topElement.hasFlipped())
			this.bottomElement.startFlip();
	}
	else
	{
		if(this.bottomElement.hasFlipped() == false)
			this.bottomElement.update(t);
		else
			this.staticBotEl.image.src = this.numberImagePrefix[this.valueImageIndex] + "_bot.png";
	}
}

FlipDigit.prototype.draw = function(ctx)
{
	this.staticTopEl.draw(ctx);
	this.topElement.draw(ctx);
	this.staticBotEl.draw(ctx);
	this.bottomElement.draw(ctx);
}

function FlipClock(x,y)
{
	var current_date = new Date();
	var value = current_date.getSeconds();
	var seconds = createFlipDigit(x + 800,y,0,0,10);
	seconds.setValue(value % 10);

	var teen_seconds = createFlipDigit(x + 700,y,0,0,6);
	teen_seconds.setValue((value - (value % 10))/10);

	value = current_date.getMinutes();
	var minutes = createFlipDigit(x + 600,y,value % 10,0,10);
	minutes.setValue(value % 10);

	var teen_minutes = createFlipDigit(x + 500,y,0,0,6);
	teen_minutes.setValue((value - (value % 10))/10);

	value = current_date.getHours();
	var hours = createFlipDigit(x + 400,y,0,0,24);
	hours.setValue(value % 10);

	var teen_hours = createFlipDigit(x + 300,y,(value - (value % 10))/10,0,3);
	teen_hours.setValue((value - (value % 10))/10);

	var days = createFlipDigit(x + 650,y - 350,0,0,10);
	var teen_days = createFlipDigit(x + 550,y - 350,0,0,10);
	var hun_days = createFlipDigit(x + 450,y - 350,0,0,10);

	seconds.setMaxReachedCallBack(function() {teen_seconds.increment()});
	teen_seconds.setMaxReachedCallBack(function() {minutes.increment()});
	minutes.setMaxReachedCallBack(function() {teen_minutes.increment()});
	teen_minutes.setMaxReachedCallBack(function() {hours.increment()});
	hours.setMaxReachedCallBack(function() {teen_hours.increment()});
	teen_hours.setMaxReachedCallBack(function() {hun_hours.increment()});

	this.seconds = seconds;
	this.teen_seconds = teen_seconds;
	this.minutes = minutes;
	this.teen_minutes = teen_minutes;
	this.hours = hours;
	this.teen_hours = teen_hours;
	this.days = days;
	this.teen_days = teen_days;
	this.hun_days = hun_days;

	this.days_label = new Image();
	this.days_label.src = "nums/days.png";
	this.hours_label = new Image();
	this.hours_label.src = "nums/hours.png";
	this.minutes_label = new Image();
	this.minutes_label.src = "nums/minutes.png";
	this.seconds_label = new Image();
	this.seconds_label.src = "nums/seconds.png";
}

FlipClock.prototype.update = function(t)
{
	this.seconds.update(t);
	this.teen_seconds.update(t);
	this.minutes.update(t);
	this.teen_minutes.update(t);
	this.hours.update(t);
	this.teen_hours.update(t);
	this.days.update(t);
	this.teen_days.update(t);
	this.hun_days.update(t);
}

FlipClock.prototype.drawLabels = function(ctx)
{
	ctx.drawImage(this.hours_label,this.teen_hours.getX(),this.teen_hours.getY() - 100,200,100);
	ctx.drawImage(this.minutes_label,this.teen_minutes.getX(),this.teen_minutes.getY() - 100,200,100);
	ctx.drawImage(this.seconds_label,this.teen_seconds.getX(),this.teen_seconds.getY() - 100,200,100);
	ctx.drawImage(this.days_label,this.hun_days.getX(),this.hun_days.getY() - 100,300,100);
}

FlipClock.prototype.draw = function(ctx)
{
	this.drawLabels(ctx)
	this.seconds.draw(ctx);
	this.teen_seconds.draw(ctx);
	this.minutes.draw(ctx);
	this.teen_minutes.draw(ctx);
	this.hours.draw(ctx);
	this.teen_hours.draw(ctx);
	this.days.draw(ctx);
	this.teen_days.draw(ctx);
	this.hun_days.draw(ctx);
}

FlipClock.prototype.increment = function()
{
	this.seconds.increment();
}

FlipClock.prototype.decrement = function()
{
	this.seconds.decrement();
}

function stripSingularDigit(value)
{
	return (value - (value % 10))/10;
}

function CountDownClock(year,month,day,hours,minutes,seconds,x,y)
{
	var futureUTCDate = new Date(year,month - 1,day,hours,minutes,seconds);
	var currentDate = new Date();//current date
	var dateDiff = futureUTCDate - currentDate;

	//From Manny's countdown code
	var secInMill = 1000;
	var minInMill = 60 * secInMill;
	var hoursInMill = 60 * minInMill;
	var dayInMill = 24 * hoursInMill;

	this.daysLeft = Math.floor(dateDiff/dayInMill);
	this.hour = Math.floor((dateDiff%dayInMill)/(hoursInMill));
	this.min = Math.floor(((dateDiff%dayInMill) % hoursInMill)/minInMill);
	this.sec = Math.floor((((dateDiff%dayInMill) % hoursInMill) % minInMill)/secInMill);
	this.countdown_finish = false;

	//Got the countdown values, time to setup the FlipDigits
	var secondsLeft = this.daysLeft * 24 * 60 * 60 + (this.hour * 60 * 60) + (this.min * 60) + this.sec;
	var seconds = createFlipDigit(x + 900,y,secondsLeft,this.sec % 10,10);

	var dspTeenSeconds = stripSingularDigit(this.sec);//the teen value than needs to be displayed
	var teen_seconds = createFlipDigit(x + 800,y,stripSingularDigit(secondsLeft),dspTeenSeconds,6);

	var minutesLeft = this.daysLeft * 24 * 60 + (this.hour * 60) + this.min;
	var minutes = createFlipDigit(x + 690,y,minutesLeft,this.min % 10,10);

	var dspTeenMinutes = stripSingularDigit(this.min);
	var teen_minutes = createFlipDigit(x + 590,y,stripSingularDigit(minutesLeft),dspTeenMinutes,6);

	var hoursLeft = this.daysLeft * 24  + this.hour;
	var hours = createFlipDigit(x + 480,y,hoursLeft,this.hour,24);

	var dspTeenHours = stripSingularDigit(this.hour);
	var teen_hours = createFlipDigit(x + 380,y,stripSingularDigit(hoursLeft),dspTeenHours,3);

	var days = createFlipDigit(x + 250,y,this.daysLeft,this.daysLeft % 10,10);

	var dspTeenDays = stripSingularDigit(this.daysLeft);
	var teen_days = createFlipDigit(x + 150,y,dspTeenDays,dspTeenDays % 10,10);
	var hun_days = createFlipDigit(x +50,y,0,0,10);
	if(this.daysLeft > 99)
	{
		hun_days = createFlipDigit(x + 50,y,(this.daysLeft - (this.daysLeft % 100))/100,(this.daysLeft - (this.daysLeft % 100))/100,10);
	}

	seconds.setMaxReachedCallBack(function() {teen_seconds.decrement()});
	teen_seconds.setMaxReachedCallBack(function() {minutes.decrement()});
	minutes.setMaxReachedCallBack(function() {teen_minutes.decrement()});
	teen_minutes.setMaxReachedCallBack(function()
	{
		hours.decrement();
	});
	hours.setMaxReachedCallBack(function() {teen_hours.decrement()});
	teen_hours.setMaxReachedCallBack(function() {
		days.decrement()
	});

	//teen_hours does not have call back to decrement days, as teen hours can be zero,
	//while there are still single hours left. For now an explicit check has to be built
	//in to check when days must be decrement ie. when hours and teen_hours == 0

	days.setMaxReachedCallBack(function() {teen_days.decrement()});
	teen_days.setMaxReachedCallBack(function() {hun_days.decrement()});

	this.seconds = seconds;
	this.teen_seconds = teen_seconds;
	this.minutes = minutes;
	this.teen_minutes = teen_minutes;
	this.hours = hours;
	this.teen_hours = teen_hours;
	this.days = days;
	this.teen_days = teen_days;
	this.hun_days = hun_days;

	this.days_label = new Image();
	this.days_label.src = "nums/days.png";
	this.hours_label = new Image();
	this.hours_label.src = "nums/hours.png";
	this.minutes_label = new Image();
	this.minutes_label.src = "nums/minutes.png";
	this.seconds_label = new Image();
	this.seconds_label.src = "nums/seconds.png";
}


CountDownClock.prototype.countdown = function(t)
{
	if(this.last_update == null)
	{
		this.last_update = t;
		if(this.countdown_finish == false)
			this.doCountdown();
	}
	else if (t - this.last_update >= 15.00)//this value is hand tuned ... ensures that the seconds gets decremented at aprrox. -1 every second. Why 7.5 ... FUCK KNOWS!
	{
		this.last_update = t;
		if(this.countdown_finish == false)
			this.doCountdown();
	}
}

CountDownClock.prototype.removeCallback = function(object)
{
	object.setMaxReachedCallBack(function(){});
}

CountDownClock.prototype.doCountdown = function()
{
	if(this.countdown_finish != true)
		this.seconds.decrement();
	if(this.hasZeroTimeLeft() && this.hasZeroDaysLeft())
	{
		this.countdown_finish = true;
	}
	if(this.hasZeroTimeLeft())
	{
		this.days.decrement();
	}
	if(this.hasZeroDaysLeft() && this.countdown_finish == false)
	{
		var stop = this.hasZeroHoursLeft();
		if(stop)
			this.removeCallback(this.teen_minutes);
		stop = stop && this.hasZeroMinutesLeft();
		if(stop)
			this.removeCallback(this.teen_seconds);
		stop = stop && this.hasZeroSecondsLeft();
		if(stop)
			this.countdown_finish = true;

	}

}

CountDownClock.prototype.hasZeroTimeLeft = function()
{
	return this.hasZeroHoursLeft() && this.hasZeroMinutesLeft() && this.hasZeroSecondsLeft();
}

CountDownClock.prototype.hasZeroDaysLeft = function()
{
	return this.days.getValue() == 0 && this.teen_days.getValue() == 0 && this.hun_days.getValue() == 0;
}


CountDownClock.prototype.hasZeroHoursLeft = function()
{
	return this.hours.getValue() == 0 && this.teen_hours.getValue() == 0;
}

CountDownClock.prototype.hasZeroMinutesLeft = function()
{
	return this.minutes.getValue() == 0 && this.teen_minutes.getValue() == 0;
}

CountDownClock.prototype.hasZeroSecondsLeft = function()
{
	return this.seconds.getValue() == 0 && this.teen_seconds.getValue() == 0;
}

CountDownClock.prototype.update = function(t)
{
	this.countdown(t);
	this.seconds.update(t);
	this.teen_seconds.update(t);
	this.minutes.update(t);
	this.teen_minutes.update(t);
	this.hours.update(t);
	this.teen_hours.update(t);
	this.days.update(t);
	this.teen_days.update(t);
	this.hun_days.update(t);
}

CountDownClock.prototype.drawLabels = function(ctx)
{
	ctx.drawImage(this.hours_label,this.teen_hours.getX(),this.teen_hours.getY() - 100,200,100);
	ctx.drawImage(this.minutes_label,this.teen_minutes.getX(),this.teen_minutes.getY() - 100,200,100);
	ctx.drawImage(this.seconds_label,this.teen_seconds.getX(),this.teen_seconds.getY() - 100,200,100);
	ctx.drawImage(this.days_label,this.hun_days.getX(),this.hun_days.getY() - 100,300,100);
}

CountDownClock.prototype.draw = function(ctx)
{
	this.drawLabels(ctx)
	this.seconds.draw(ctx);
	this.teen_seconds.draw(ctx);
	this.minutes.draw(ctx);
	this.teen_minutes.draw(ctx);
	this.hours.draw(ctx);
	this.teen_hours.draw(ctx);
	this.days.draw(ctx);
	this.teen_days.draw(ctx);
	this.hun_days.draw(ctx);
}

function update(t,dt)
{
	flipClock.update(t);
}

function main_loop()
{
	var newTime = new Date();
	var elapsed_time = newTime.getTime() - current_time;
	current_time = newTime.getTime();

	if (elapsed_time > 0.25)
	{
		elapsed_time = 0.25;
	}

	accum = accum + elapsed_time;
	while (accum >= dt)
	{
		update(t,dt);
		t = t + dt;
		accum = accum - dt;
	}
	draw();
	window.requestAnimFrame(main_loop);
}


