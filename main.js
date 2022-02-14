// const serverUrl = "https://fk4jy8xn0kxb.usemoralis.com:2053/server";
// const appId = "jI8SVKJXt0WqbjFIeRZKrx7r4YMZ9OOQHmtOSKJe";
// Moralis.start({ serverUrl, appId });

// /** Add from here down */
// async function login() {
//   let user = Moralis.User.current();
//   if (!user) {
//    try {
//       user = await Moralis.authenticate({ signingMessage: "Hello World!" })
//       console.log(user)
//       console.log(user.get('ethAddress'))
//    } catch(error) {
//      console.log(error)
//    }
//   }
// }



const serverUrl = "https://fk4jy8xn0kxb.usemoralis.com:2053/server"; //Server url from moralis.io
const appId = "jI8SVKJXt0WqbjFIeRZKrx7r4YMZ9OOQHmtOSKJe"; // Application id from moralis.io

let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await Moralis.start({ serverUrl, appId });
  await Moralis.enableWeb3();
  await listAvailableTokens();
  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById("swap_button").disabled = false;
  }
  searchToken();
  launch();
}

async function listAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
  });
  tokens = result.tokens;
  console.log("tokens: ", tokens);
  let parent = document.getElementById("token_list");
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement("div");
    div.setAttribute("data-address", address);
    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function searchToken(){
    // $('#item1 span').html();
    var input = document.getElementById('myInput');
    var search = input.value.toUpperCase();
    var parentDiv, childDiv, childSpan;
    parentDiv = document.getElementById("token_list");
    childDiv = parentDiv.getElementsByTagName("span");
    var main = parentDiv.getElementsByClassName("token_row")
    for(const i in main){
        childSpan = main[i];
        var temp = childSpan.getElementsByTagName("span")[0].innerText;
        if(temp.toUpperCase().indexOf(search) > -1){
            main[i].style.display = "";
        } else{
            main[i].style.display = "none";
        }
    }
}

function selectToken(address) {
  closeModal();
  console.log(tokens);
  currentTrade[currentSelectSide] = tokens[address];
  console.log(currentTrade);
  renderInterface();
  getQuote();

}

function renderInterface() {
  if (currentTrade.from) {
    document.getElementById("from_token_img").src = currentTrade.from.logoURI;
    document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
  }
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.authenticate();
    }
    document.getElementById("swap_button").disabled = false;
  } catch (error) {
    console.log(error);
  }
}

function hideTextFrom() {
    document.getElementById("select_token_from").innerHTML = "";
}

function hideTextTo() {
    document.getElementById("select_token_to").innerHTML = "";
}


function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}
function closeModal() {
  document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
  if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;

  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

  const quote = await Moralis.Plugins.oneInch.quote({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
  });
  console.log(quote);
  document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
  document.getElementById("to_amount").value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

async function trySwap() {
  let address = Moralis.User.current().get("ethAddress");
  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  if (currentTrade.from.symbol !== "ETH") {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentTrade.from.address, // The token you want to swap
      fromAddress: address, // Your wallet address
      amount: amount,
    });
    console.log(allowance);
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
      });
    }
  }
  try {
    let receipt = await doSwap(address, amount);
    alert("Swap Complete");
  } catch (error) {
    console.log(error);
  }
}

function doSwap(userAddress, amount) {
  return Moralis.Plugins.oneInch.swap({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
    fromAddress: userAddress, // Your wallet address
    slippage: 1,
  });
}

init();

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}



document.getElementById("btn-logout").onclick = logOut;

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
  hideTextFrom();
  

};
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
  hideTextTo();
};

document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;


let toks = [];

async function launch(){

let response = await fetch("https://gateway.ipfs.io/ipns/tokens.uniswap.org");
let names = await response.json()
toks = names.tokens;

toks.forEach((e,i) =>
document.getElementById("list").add(new Option(e.symbol, i))
)

priceHistory()
}

launch()

async function priceHistory() {

  let days = document.querySelector('input[name="time"]:checked').value;
  let i = document.getElementById("list").value
  let addrs = toks[i].address
  let sym = toks[i].symbol

  let dates1 = Array(Number(days)).fill().map((e,i) =>
    moment().subtract(i, "d").format('YYYY-MM-DD')
  ).reverse()
  
  let blocks1 = await Promise.all(dates1.map(async (e, i) =>
    await Moralis.Web3API.native.getDateToBlock({date:e})
  ))

  let prices1 = await Promise.all(blocks1.map(async(e , i) =>
    await Moralis.Web3API.token.getTokenPrice({address:addrs, to_block:e.block})
  ))
  prices1 = prices1.map(e => e.usdPrice)

  console.log("prices:", prices1)

  const data = {
    labels: dates1,
    datasets: [{
    label: sym,
    backgroundColor: 'rgb(255, 99, 132)',
    borderColor: 'rgb(255, 99, 132)',
    data:prices1,
    }]
  };

  const config = {
    type: 'line',
    data: data,
    options: {}
  };

  if(window.myChart instanceof Chart){
    myChart.destroy()
  }

  window.myChart = new Chart(
    document.getElementById('myChart'),
    config
  );

}


document.getElementById("week").onclick = priceHistory;
document.getElementById("2week").onclick = priceHistory;
document.getElementById("4week").onclick = priceHistory;
document.getElementById("list").onchange = priceHistory;

