
(()=>{
  const images=[
    "/pso/assets/world-footers/world-footer-01.png",
    "/pso/assets/world-footers/world-footer-02.png",
    "/pso/assets/world-footers/world-footer-03.png",
    "/pso/assets/world-footers/world-footer-04.png"
  ];
  document.querySelectorAll("[data-jw-random-footer]").forEach(img=>{
    const start=Math.floor(Math.random()*images.length);
    let attempt=0;
    const tryImage=()=>{
      if(attempt>=images.length){
        img.removeAttribute("src");
        img.alt="";
        return;
      }
      img.onerror=tryImage;
      img.src=images[(start+attempt)%images.length];
      attempt++;
    };
    tryImage();
  });
})();
