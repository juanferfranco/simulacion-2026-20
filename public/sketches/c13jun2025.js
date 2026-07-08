export default function sketch(p) {


    let w,t,i,q,c,d,e,k;

    let a=(x,y,d=p.mag(k=(4+p.sin(y*2-t)*3)*p.cos(x/29),e=y/8-13))=>p.point((q=3*p.sin(k*2)+.3/k+p.sin(y/25)*k*(9+4*p.sin(e*9-d*3+t*2)))+70*p.cos(c=d-t)+w/2,q*p.sin(c)+d*45-0.55*w/2)
    t=0,p.draw=$=>{t||p.createCanvas(w=600,w);p.background(9).stroke(w,96);for(t+=p.PI/240,i=7000;i--;)a(i,i/235)}//

    p.keyPressed = function(){
        console.log(p.frameRate());
    }
}