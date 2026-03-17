export default function Result() {
    const data = JSON.parse(localStorage.getItem("maqsadlar")) || [];
  
    return (
      <div>
        <h2>Maqsadlar:</h2>
        {data.map((item, index) => (
          <p key={index}>{item}</p>
        ))}
      </div>
    );
  }