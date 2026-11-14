/* qrcode.js - Motor de Renderização Pix JCS Software */
var QRCode;
!function(){
    function a(a){this.mode=4,this.data=a}
    function b(a,b){this.typeNumber=a,this.errorCorrectLevel=b,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}
    a.prototype={getLength:function(){return this.data.length},write:function(a){for(var b=0;b<this.data.length;b++)a.put(this.data.charCodeAt(b),8)}};
    b.prototype={
        addData:function(b){var c=new a(b);this.dataList.push(c),this.dataCache=null},
        isDark:function(a,b){if(a<0||this.moduleCount<=a||b<0||this.moduleCount<=b)return!1;return this.modules[a][b]},
        getModuleCount:function(){return this.moduleCount},
        make:function(){this.makeImpl(!1,this.getBestPattern())},
        makeImpl:function(a,c){
            this.moduleCount=4*this.typeNumber+17;this.modules=new Array(this.moduleCount);
            for(var d=0;d<this.moduleCount;d++){this.modules[d]=new Array(this.moduleCount);for(var e=0;e<this.moduleCount;e++)this.modules[d][e]=null}
            this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);
            this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(a,c);
            if(this.typeNumber>=7)this.setupTypeNumber(a);
            if(null==this.dataCache)this.dataCache=b.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);
            this.mapData(this.dataCache,c)
        },
        setupPositionProbePattern:function(a,b){
            for(var c=-1;7>=c;c++)if(!(a+c<-1||this.moduleCount<=a+c))
            for(var d=-1;7>=d;d++)b+d<-1||this.moduleCount<=b+d||(c>=0&&6>=c&&(0==d||6==d)||d>=0&&6>=d&&(0==c||6==c)||c>=2&&4>=c&&d>=2&&4>=d?this.modules[a+c][b+d]=!0:this.modules[a+c][b+d]=!1)
        },
        getBestPattern:function(){for(var a=0,b=0,c=0;8>c;c++){this.makeImpl(!0,c);var d=f.getLostPoint(this);(0==c||a>d)&&(a=d,b=c)}return b},
        setupTimingPattern:function(){for(var a=8;this.moduleCount-8>a;a++)null==this.modules[a][6]&&(this.modules[a][6]=a%2==0),null==this.modules[6][a]&&(this.modules[6][a]=a%2==0)},
        setupPositionAdjustPattern:function(){
            var a=f.getPatternPosition(this.typeNumber);
            for(var b=0;b<a.length;b++)for(var c=0;c<a.length;c++){
                var d=a[b],e=a[c];
                if(null==this.modules[d][e])for(var g=-2;2>=g;g++)for(var h=-2;2>=h;h++)0==g||6==g||0==h||6==h||0==g&&0==h?this.modules[d+g][e+h]=!0:this.modules[d+g][e+h]=!1
            }
        },
        setupTypeInfo:function(a,b){
            var c=this.errorCorrectLevel<<3|b,d=f.getBCHTypeInfo(c);
            for(var e=0;15>e;e++){var g=!a&&1==(d>>e&1);6>e?this.modules[e][8]=g:8>e?this.modules[e+1][8]=g:this.modules[this.moduleCount-15+e][8]=g}
            for(var e=0;15>e;e++){var g=!a&&1==(d>>e&1);8>e?this.modules[8][this.moduleCount-e-1]=g:9>e?this.modules[8][15-e-1+1]=g:this.modules[8][15-e-1]=g}
            this.modules[this.moduleCount-8][8]=!a
        },
        setupTypeNumber:function(a){
            var b=f.getBCHTypeNumber(this.typeNumber);
            for(var c=0;18>c;c++){var d=!a&&1==(b>>c&1);this.modules[Math.floor(c/3)][c%3+this.moduleCount-8-3]=d}
            for(var c=0;18>c;c++){var d=!a&&1==(b>>c&1);this.modules[c%3+this.moduleCount-8-3][Math.floor(c/3)]=d}
        },
        mapData:function(a,b){
            for(var c=-1,d=this.moduleCount-1,e=7,g=0,h=this.moduleCount-1;h>0;h-=2){
                if(6==h)h--;
                for(;;){
                    for(var i=0;2>i;i++)if(null==this.modules[d][h-i]){var j=!1;g<a.length&&(j=1==(a[g]>>>e&1));var k=f.getMask(b,d,h-i);k&&(j=!j),this.modules[d][h-i]=j,e--,-1==e&&(g++,e=7)}
                    d+=c;if(d<0||this.moduleCount<=d){d-=c;c=-c;break}
                }
            }
        }
    };
    b.createData=function(a,c,d){
        var g=e.getRSBlocks(a,c),h=new mainBuffer;
        for(var i=0;i<d.length;i++){var j=d[i];h.put(j.mode,4),h.put(j.getLength(),f.getLengthInBits(j.mode,a)),j.write(h)}
        var k=0;for(var i=0;i<g.length;i++)k+=g[i].dataCount;
        if(h.getLengthInBits()>8*k)throw new Error("code length overflow. ("+h.getLengthInBits()+">"+8*k+")");
        for(h.getLengthInBits()+4<=8*k&&h.put(0,4);h.getLengthInBits()%8!=0;)h.putBit(!1);
        for(;;){if(h.getLengthInBits()>=8*k)break;if(h.put(236,8),h.getLengthInBits()>=8*k)break;h.put(17,8)}
        return b.createBytes(h,g)
    };
    b.createBytes=function(a,b){
        for(var c=0,d=0,e=0,g=new Array(b.length),h=new Array(b.length),i=0;i<b.length;i++){
            var j=b[i].dataCount,k=b[i].totalCount-j;d=Math.max(d,j),e=Math.max(e,k),g[i]=new Array(j);
            for(var l=0;l<g[i].length;l++)g[i][l]=255&a.buffer[l+c];c+=j;
            var m=f.getErrorCorrectPolynomial(k),n=new rsPoly(g[i],k),o=n.mod(m);h[i]=new Array(m.getLength()-1);
            for(var l=0;l<h[i].length;l++){var p=l+o.getLength()-h[i].length;h[i][l]=p>=0?o.get(p):0}
        }
        var q=0;for(var l=0;l<b.length;l++)q+=b[l].totalCount;
        for(var r=new Array(q),s=0,l=0;d>l;l++)for(var i=0;i<b.length;i++)l<g[i].length&&(r[s++]=g[i][l]);
        for(var l=0;e>l;l++)for(var i=0;i<b.length;i++)l<h[i].length&&(r[s++]=h[i][l]);
        return r
    };
    var e={RS_BLOCK_TABLE:[[26,19],[38,34],[67,55],[96,80],[134,104],[172,139],[229,177],[287,230],[363,283],[441,351]]};
    e.getRSBlocks=function(a,b){var c=e.getRsBlockTable(a,b);var d=[];for(var f=0;f<c.length/2;f++)d.push(new e(c[2*f],c[2*f+1]));return d};
    e.getRsBlockTable=function(a,b){return [1,e.RS_BLOCK_TABLE[a-1][0],e.RS_BLOCK_TABLE[a-1][1]]};
    function e(a,b){this.dataCount=b,this.totalCount=a}
    var f={PATTERN_POSITION_TABLE:[[],[6,24],[6,28],[6,32],[6,36],[6,40],[6,22,38],[6,24,42],[6,26,46],[6,28,50]],G15:1335,G18:7973,G15_MASK:21522};
    f.getBCHTypeInfo=function(a){for(var b=a<<10;f.getBCHDigit(b)-f.getBCHDigit(f.G15)>=0;)b^=f.G15<<(f.getBCHDigit(b)-f.getBCHDigit(f.G15));return(a<<10|b)^f.G15_MASK};
    f.getBCHTypeNumber=function(a){for(var b=a<<12;f.getBCHDigit(b)-f.getBCHDigit(f.G18)>=0;)b^=f.G18<<(f.getBCHDigit(b)-f.getBCHDigit(f.G18));return a<<12|b};
    f.getBCHDigit=function(a){for(var b=0;0!=a;)b++,a>>>=1;return b};
    f.getPatternPosition=function(a){return f.PATTERN_POSITION_TABLE[a-1]};
    f.getMask=function(a,b,c){switch(a){case 0:return(b+c)%2==0;case 1:return b%2==0;case 2:return c%3==0;case 3:return(b+c)%3==0;case 4:return(Math.floor(b/2)+Math.floor(c/3))%2==0;case 5:return b*c%2+b*c%3==0;case 6:return(b*c%2+b*c%3)%2==0;case 7:return(b*c%3+(b+c)%2)%2==0;default:throw new Error("bad maskPattern:"+a)}};
    f.getErrorCorrectPolynomial=function(a){for(var b=new rsPoly([1],0),c=0;a>c;c++)b=b.multiply(new rsPoly([1,mathGalois.gexp(c)],0));return b};
    f.getLengthInBits=function(a,b){if(b>=1&&10>b)switch(a){case 4:return 8;default:return 8}else return 16};
    f.getLostPoint=function(a){
        var b=a.getModuleCount(),c=0;
        for(var d=0;b>d;d++)for(var e=0;b>e;e++){var f=0,g=a.isDark(d,e);for(var h=-1;1>=h;h++)if(!(d+h<0||b<=d+h))for(var i=-1;1>=i;i++)e+i<0||b<=e+i||(0!=h||0!=i)&&g==a.isDark(d+h,e+i)&&f++;f>5&&(c+=3+f-5)}
        for(var d=0;b-1>d;d++)for(var e=0;b-1>e;e++){var j=0;a.isDark(d,e)&&j++,a.isDark(d+1,e)&&j++,a.isDark(d,e+1)&&j++,a.isDark(d+1,e+1)&&j++,(0==j||4==j)&&(c+=3)}
        for(var d=0;b>d;d++)for(var e=0;b-6>e;e++)a.isDark(d,e)&&!a.isDark(d,e+1)&&a.isDark(d,e+2)&&a.isDark(d,e+3)&&a.isDark(d,e+4)&&!a.isDark(d,e+5)&&a.isDark(d,e+6)&&(c+=40);
        for(var e=0;b>e;e++)for(var d=0;b-6>d;d++)a.isDark(d,e)&&!a.isDark(d+1,e)&&a.isDark(d+2,e)&&a.isDark(d+3,e)&&a.isDark(d+4,e)&&!a.isDark(d+5,e)&&a.isDark(d+6,e)&&(c+=40);
        var k=0;for(var e=0;b>e;e++)for(var d=0;b>d;d++)a.isDark(d,e)&&k++;var l=Math.abs(100*k/b/b-50)/5;return c+=10*l
    };
    var mathGalois={
        glog:function(a){if(1>a)throw new Error("glog("+a+")");return mathGalois.LOG_TABLE[a]},
        gexp:function(a){for(;0>a;)a+=255;for(;a>=255;)a-=255;return mathGalois.EXP_TABLE[a]},
        EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)
    };
    for(var r=0;8>r;r++)mathGalois.EXP_TABLE[r]=1<<r;for(var r=8;256>r;r++)mathGalois.EXP_TABLE[r]=mathGalois.EXP_TABLE[r-4]^mathGalois.EXP_TABLE[r-5]^mathGalois.EXP_TABLE[r-6]^mathGalois.EXP_TABLE[r-8];
    for(var r=0;255>r;r++)mathGalois.LOG_TABLE[mathGalois.EXP_TABLE[r]]=r;
    function rsPoly(a,b){if(void 0==a.length)throw new Error(a.length+"/"+b);var c=0;while(c<a.length&&0==a[c])c++;this.num=new Array(a.length-c+b);for(var d=0;d<a.length-c;d++)this.num[d]=a[d+c]}
    rsPoly.prototype={
        get:function(a){return this.num[a]},getLength:function(){return this.num.length},
        multiply:function(a){
            var b=new Array(this.getLength()+a.getLength()-1);
            for(var c=0;c<this.getLength();c++)for(var d=0;d<a.getLength();d++)b[c+d]^=mathGalois.gexp(mathGalois.glog(this.get(c))+mathGalois.glog(a.get(d)));
            return new rsPoly(b,0)
        },
        mod:function(a){
            if(this.getLength()-a.getLength()<0)return this;
            var b=mathGalois.glog(this.get(0))-mathGalois.glog(a.get(0)),c=new Array(this.getLength());
            for(var d=0;d<this.getLength();d++)c[d]=this.get(d);
            for(var d=0;d<a.getLength();d++)c[d]^=mathGalois.gexp(mathGalois.glog(a.get(d))+b);
            return new rsPoly(c,0).mod(a)
        }
    };
    function mainBuffer(){this.buffer=[],this.length=0}
    mainBuffer.prototype={
        get:function(a){var b=Math.floor(a/8);return 1==(this.buffer[b]>>>7-a%8&1)},
        put:function(a,b){for(var c=0;b>c;c++)this.putBit(1==(a>>>b-c-1&1))},
        getLengthInBits:function(){return this.length},
        putBit:function(a){var b=Math.floor(this.length/8);this.buffer.length<=b&&this.buffer.push(0),a&&(this.buffer[b]|=128>>>this.length%8),this.length++}
    };
    QRCode=function(a,c){
        var d=4;if(c.text.length>110)d=5;
