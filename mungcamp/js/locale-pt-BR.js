/* Interface translations. Player names, messages, questions and answers stay as written. */
(function (MC) {
  'use strict';
  MC.Portuguese = Object.fromEntries(`
멍캠프|Mung Camp
· 나|· eu
· 운영자|· professor
비밀번호를 여러 번 틀렸어요. 잠시 후 다시 시도해 주세요.|Muitas tentativas incorretas. Aguarde e tente novamente.
비밀번호가 맞지 않아요. 다시 입력해 주세요.|Senha incorreta. Digite novamente.
배움터에 백 명이 모였어요. 잠시 후 다시 와 주세요.|A sala está cheia. Tente novamente em instantes.
배움터 비밀번호를 입력하고 들어와 주세요.|Entre com a senha da sala.
친구들에게 전할 말을 적어 주세요.|Escreva uma mensagem para os amigos.
한 박자 쉬고 다시 보내 주세요.|Espere um pouco antes de enviar novamente.
지금은 답을 제출할 수 없어요. 현재 질문을 확인해 주세요.|Não é possível responder agora. Confira a pergunta atual.
보기 중 하나를 골라 주세요.|Escolha uma das opções.
팻말에 올릴 답을 적어 주세요.|Escreva sua resposta para a plaquinha.
이 기능은 진행자만 사용할 수 있어요.|Somente o professor pode usar esta função.
질문을 적고, 객관식은 서로 다른 보기 2~6개를 넣어 주세요.|Escreva a pergunta. Para múltipla escolha, inclua de 2 a 6 opções diferentes.
포근함|Aconchego
나른함|Sossego
설렘|Alegria
몽글몽글|Leveza
노곤노곤|Soninho
차분함|Calma
잔잔함|Serenidade
싱숭생숭|Agitação
두근두근|Animação
홀가분|Alívio
고요|Paz
뭉게구름|Nuvens
말랑말랑|Suavidade
복잡함|Confusão
지침|Cansaço
멍|Pausa
느긋함|Tranquilo
보송보송|Fofura
따끈따끈|Quentinho
살랑살랑|Brisa leve
{name}, 누르면 내 닉네임 숨기기|{name}, clique para ocultar meu apelido
왼쪽 코트가 내 자리 · 점프해서 공을 받아요!|Sua quadra é a esquerda · Pule para receber a bola!
오른쪽 코트가 내 자리 · 점프해서 공을 받아요!|Sua quadra é a direita · Pule para receber a bola!
나는 술래! 잠깐 눈을 감아요 · {n}초|Você é o pegador! Feche os olhos · {n} s
나는 숨는 멍이 · 얼른 숨어요! · {n}초|Você vai se esconder! Corra! · {n} s
나는 도망가는 멍이 · 먼저 출발! · {n}초|Você vai fugir! Corra primeiro! · {n} s
나는 술래 · 덤불 가까이에서 수색! · {clock}|Você é o pegador · Procure nos arbustos! · {clock}
나는 술래 · 가까이 가서 잡기! · {clock}|Você é o pegador · Aproxime-se para pegar! · {clock}
위치를 감췄어요 · 움직이면 밖으로 나와요 · {clock}|Você está escondido · Mover-se revela sua posição · {clock}
술래를 피해 달려요! · {clock}|Fuja do pegador! · {clock}
지름길 → {n}|Atalho → {n}
미끄럼 → {n}|Escorregão → {n}
{name} · {dice}! 지름길을 타고 {n}칸으로!|{name} · {dice}! Pegou um atalho até a casa {n}!
{name} · {dice}! 앗, 미끄러져 {n}칸으로!|{name} · {dice}! Escorregou até a casa {n}!
{name} · {dice}! {n}칸에 도착했어요|{name} · {dice}! Chegou à casa {n}
두 멍이가 한 편씩 맡아요. ← → 또는 A·D로 이동하고, ↑·W·Space로 점프해요. 휴대폰에서는 이동 버튼을 꾹 누르며 점프를 함께 누를 수 있어요. 몸에 닿은 공은 자동으로 튀어 올라요. 상대 코트 바닥에 공을 떨어뜨려 먼저 5점을 얻으면 이겨요.|Dois jogadores, um de cada lado. Use ← → ou A/D para mover e ↑, W ou Espaço para pular. No celular, mantenha a direção pressionada e toque em Pular. A bola rebate ao tocar seu corpo. Faça a bola cair na quadra adversária e marque 5 pontos para vencer.
방향키·WASD 또는 땅을 톡 눌러 이동해요. 처음 참가한 멍이가 놀이를 고르고 시작해요. 술래잡기는 가까이 가서 ‘잡기’ 또는 Space! 숨바꼭질은 덤불 안에서 ‘숨기’ 또는 Space로 위치를 완전히 감춰요. 가까이 와도 저절로 보이지 않아요. 술래는 덤불 가까이에서 ‘수색’ 또는 Space로 찾아요. 시야 밖과 장애물 뒤의 멍이도 보이지 않아요. 걸으면 숨기에서 나와요.|Use as setas, WASD ou toque no chão para mover. O primeiro participante escolhe e inicia o jogo. No pega-pega, aproxime-se e use Pegar ou Espaço. No esconde-esconde, entre em um arbusto e use Esconder ou Espaço. O pegador precisa usar Procurar perto dos arbustos. Obstáculos e distância bloqueiam a visão. Mover-se tira você do esconderijo.
1~4명이 참가해요. 혼자 시작하면 산책봇과 대결해요. 내 차례에 주사위 버튼 또는 Space를 누르면 나온 수만큼 자동으로 이동해요. 지름길 ↗은 앞으로, 미끄럼 ↙은 뒤로! 30칸 보물섬에 먼저 닿으면 이겨요. 넘치는 수는 신경 쓰지 않아도 돼요. 22초 동안 누르지 않으면 자동으로 굴려요. 처음 참가한 멍이가 놀이를 고르고 시작해요.|De 1 a 4 jogadores. Sozinho, você enfrenta o amigo virtual. Na sua vez, clique no dado ou aperte Espaço para avançar. Atalhos ↗ levam para frente e escorregões ↙ para trás! Vença chegando primeiro à casa 30; não precisa tirar o número exato. O dado rola automaticamente após 22 segundos. O primeiro participante escolhe e inicia o jogo.
캠프 마을. 방향키나 클릭으로 멍이를 걷게 해요|Vila do acampamento. Use as setas ou clique para passear com seu cachorrinho.
누르면 내 닉네임을 숨겨요|Clique para ocultar meu apelido
멍 때리고 가요.|Pare um pouco. Relaxe.
마을|Vila
모두|Total
건의|Sugestões
배움터|Sala de aula
꾸미기|Personalizar
팻말|Plaquinha
의자|Cadeira
바닷가 활동|Atividades na praia
낚싯대 던지기|Lançar a linha
거두기|Recolher
선착장으로|Voltar ao cais
장면|Cenário
나가기|Sair
함께|Juntos
전체 화면|Tela cheia
바닷속 탐험|Exploração submarina
보물 찾기|Buscar tesouro
바다 상점|Loja do mar
바닷속 탐험 지도|Mapa da exploração submarina
산호 정원|Jardim de corais
진주 만|Baía das pérolas
푸른 심해|Mar profundo
불 속으로 끌어 넣어요|Arraste para a fogueira
넣기|Colocar
소리|Som
닫기|Fechar
전체|Volume geral
끄기|Desativar
켜기|Ativar
호흡|Respiração
호흡법|Exercícios de respiração
안내음|Sinal sonoro
시작|Começar
멈추기|Parar
유리병 편지|Mensagem na garrafa
바다에 띄울 마음|Uma mensagem para o mar
골라 쓰기|Escolha uma sugestão
저장되지 않아요|A mensagem não será salva
띄우기|Lançar ao mar
걱정 태우기|Queimar preocupações
마음에 걸리는 것|O que está preocupando você?
걱정|Preocupação
장작에 적기|Escrever na lenha
장면 조작|Controles do cenário
숨기기|Ocultar
잘 쉬었어요|Que bom descansar!
조금 더|Mais um pouco
당신의 현재 마음을 잘 표현할 단어를 떠올려 적어주세요.|Escreva uma palavra que expresse como você se sente agora.
누가 내 멍이를 누르면 보여요|Ela aparece quando alguém clica no seu cachorrinho
들어가기|Entrar
내 멍이|Meu cachorrinho
마음 단어|Como me sinto
다른 사람에게는 내 멍이를 누를 때 보여요|Outras pessoas veem ao clicar no seu cachorrinho
내 닉네임 표시|Mostrar meu apelido
닉네임을 누르면 숨겨요|Clique no apelido para ocultar
몸|Corpo
귀|Orelhas
기본 비니 색|Cor do gorro
바다 상점 & 옷장|Loja do mar e guarda-roupa
잠수해서 보물 코인을 모아요! 가격이 적힌 아이템을 누르면 구매하고 미리 입어봐요. 낚시 선물 10종도 모을 수 있어요. 코인과 구매품은 이 브라우저에 저장돼요.|Mergulhe para encontrar moedas! Clique nos itens com preço para comprar e experimentar. Também há 10 presentes de pesca. Moedas e compras ficam salvas neste navegador.
옷|Roupas
모자 모양|Tipo de chapéu
액세서리|Acessórios
장갑|Luvas
다 됐어요|Pronto!
내 멍이의 팻말|Plaquinha do meu cachorrinho
마을에서 내 멍이 곁에 세워요.|Coloque uma plaquinha ao lado do seu cachorrinho na vila.
네 글자 이내로 적어주세요|Escreva até 4 caracteres
업무중|Ocup
{n} / 4 · 같은 마을의 멍이들에게 보여요|{n} / 4 · Visível para os cachorrinhos desta vila
지우기|Apagar
세우기|Colocar
책 읽기|Ler um livro
멍캠프 작은 책장|Estante do Mung Camp
잠깐, 한 편|Uma pausa, uma história
책 덮기|Fechar livro
앉은 자리에서 만나는 다섯 이야기. 읽던 쪽은 기억해 둘게요.|Cinco histórias para ler enquanto descansa. Sua página será salva. Textos em coreano.
소설 읽기|Ler história
소설 본문|Texto da história
이전 쪽|Página anterior
다음 쪽|Próxima página
← 다른 이야기 고르기|← Escolher outra história
감정 표현|Emoções
멍캠프에 바라는 점,|Conte suas ideias para o Mung Camp,
불편했던 점을|o que pode melhorar
자유롭게 적어 주세요.|ou o que você gostaria de encontrar aqui.
보낸 내용은 운영자만 봐요.|Somente a administração verá sua mensagem.
이런 곳이 있으면 좋겠어요|Eu gostaria de encontrar um lugar assim…
보내기|Enviar
멍캠프 건의함|Sugestões do Mung Camp
운영자 비밀번호|Senha da administração
열기|Abrir
실제 접속 현황|Pessoas conectadas
실제 접속|Conectados
명|pessoas
더미 제외 · 열린 화면 기준 · 5초마다 갱신|Sem personagens automáticos · Telas abertas · Atualiza a cada 5 segundos
새로고침|Atualizar
모닥불|Fogueira
불꽃을 바라봐요|Observe as chamas
장작 던지기|Jogar lenha
탑불멍|Torre de lenha
장작을 던져 위로 쌓아 보세요|Jogue lenha para aumentar a pilha
장작 쌓기|Empilhar lenha
달빛 바다|Mar ao luar
잠수를 눌러 바닷속 친구와 보물을 만나 보세요|Clique em Mergulhar para encontrar animais e tesouros
물수제비|Fazer pedrinhas saltarem
잠수|Mergulhar
편지|Mensagem
편백 숲|Floresta de ciprestes
숲 소리에 귀 기울여요|Escute os sons da floresta
바람|Brisa
글램핑|Glamping
따뜻하게 쉬어요|Descanse no aconchego
장작|Lenha
불빛|Luzes
비|Chuva
숙소|Chalé
편안하게 몸을 녹여요|Aqueça-se e relaxe
귤|Tangerina
코타츠 속|Sob o kotatsu
구르기|Rolar
놀이터|Parquinho
친구들과 참가를 누르고 함께 놀아요|Clique em Participar para brincar com os amigos
멍이 앞 팻말에 내 생각을 놓아요|Compartilhe sua ideia na plaquinha
{name}님이 나를 응원해주고 있어요!|{name} está torcendo por você!
누군가 나를 응원해주고 있어요!|Alguém está torcendo por você!
다른 단어는 어때요?|Que tal outra palavra?
기본|Padrão
{n} 코인|{n} moedas
보유 · 눌러 입기|Já é seu · Clique para vestir
{n} 코인 · 구매|{n} moedas · Comprar
낚시로 얻어요|Presente de pesca
빨강|Vermelho
파랑|Azul
초록|Verde
노랑|Amarelo
보라|Roxo
분홍|Rosa
모자|Chapéu
기본 비니|Gorro padrão
벗기|Tirar
코인이 부족해요. 바다에서 잠수해 보물상자를 찾아보세요!|Moedas insuficientes. Mergulhe para encontrar baús de tesouro!
{item} 구매 완료! 다 됐어요를 누르면 입혀요.|{item} comprado! Clique em Pronto! para vestir.
{region}으로 헤엄쳐 가요|Nadando até {region}
'{name}' 멍이, 새 모습이에요|O cachorrinho '{name}' está de visual novo
멍이 곁에 팻말을 세웠어요|Plaquinha colocada ao lado do cachorrinho
팻말을 치웠어요|Plaquinha removida
팻말에 적을 짧은 말을 골라주세요|Escolha uma mensagem curta para a plaquinha
조금만 더 적어 주세요|Escreva um pouco mais
고마워요. 잘 전했어요|Obrigado! Sua sugestão foi enviada
조금 쉬었다가 다시 보내 주세요|Espere um pouco antes de enviar novamente
보내지 못했어요. 잠시 뒤에 다시 해 주세요|Não foi possível enviar. Tente novamente em instantes
보내지 못했어요. 인터넷을 확인해 주세요|Não foi possível enviar. Verifique sua conexão
비밀번호가 맞지 않아요.|Senha incorreta.
비밀번호를 다시 입력해 주세요.|Digite a senha novamente.
잠시 뒤에 다시 시도해 주세요.|Tente novamente em instantes.
운영자 비밀번호가 아직 설정되지 않았어요.|A senha da administração ainda não foi configurada.
저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.|Não foi possível salvar. Tente novamente em instantes.
불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.|Não foi possível carregar. Tente novamente em instantes.
인터넷 연결을 확인해 주세요.|Verifique sua conexão com a internet.
바다|Mar
숲|Floresta
접속 현황을 불러오지 못했어요. 잠시 후 다시 확인해요.|Não foi possível carregar as conexões. Tente novamente em instantes.
받은 건의 {n}개 · 최신순|{n} sugestões · Mais recentes primeiro
아직 받은 건의가 없어요.|Nenhuma sugestão recebida ainda.
삭제하기|Excluir
이 건의를 삭제할까요?|Excluir esta sugestão?
취소|Cancelar
삭제|Excluir
삭제했어요.|Excluído.
닉네임을 숨겼어요. 내 멍이를 누르면 다시 보여요.|Apelido oculto. Clique no seu cachorrinho para mostrar novamente.
마을에 {here}명, 멍캠프에 모두 {all}명|{here} na vila, {all} no Mung Camp
낚시 잔교|Píer de pesca
작은 선착장|Pequeno cais
가고 싶은 곳을 톡|Toque onde quer ir
방향키로 걸어요|Use as setas para passear
앉기|Sentar
다른 곳|Outro lugar
불티가 되어 날아갔어요|Virou uma faísca e foi embora
화면을 누르면 소리가 나요|Toque na tela para ativar o som
장작이 올라가고 있어요|A lenha está subindo
장작이 불로 날아가고 있어요|A lenha está indo para a fogueira
탑이 높이 쌓였어요. 잠시 불멍해요|A pilha ficou alta. Aproveite a fogueira
장작이 넉넉해요|Já temos bastante lenha
물 위로|Voltar à superfície
공기 방울|Bolhas
옆으로 쭉 헤엄쳐요! 지도를 눌러 보물을 찾아요|Nade para os lados! Use o mapa para buscar tesouros
병이 아직 떠가고 있어요|A garrafa ainda está flutuando
여기서는 의자를 펼 수 없어요|Não é possível abrir a cadeira aqui
난로가 따뜻해요|O aquecedor está quentinho
눕기|Deitar
시험|Prova
숙제|Lição de casa
성적|Notas
친구 사이|Amizades
진로|Meu futuro
가족|Família
건강|Saúde
발표|Apresentação
마감|Prazo
잠이 안 와요|Não consigo dormir
실수한 일|Um erro que cometi
비교하는 마음|Comparar-me com os outros
할 일이 너무 많아요|Tenho coisas demais para fazer
외로움|Solidão
내일 일|O dia de amanhã
돈|Dinheiro
고마워|Obrigado
수고했어|Você se esforçou muito
괜찮아|Tudo bem
보고 싶어|Saudades de você
미안해|Desculpe
잘 될 거야|Vai dar certo
오늘도 애썼어|Você fez o seu melhor hoje
안녕|Olá
푹 자|Durma bem
소리의 출처|Créditos dos sons
풀벌레|Insetos
파도|Ondas
계곡물|Riacho
새소리|Pássaros
밤|Noite
난로|Aquecedor
바깥|Lá fora
주전자|Chaleira
정자|Gazebo
똑|Tocar
낚싯대나 노를 내려놓은 뒤 정자에서 쉬어요.|Guarde a vara ou o remo antes de descansar no gazebo.
방석이 모두 차 있어요. 잠시만 기다려 주세요.|Todas as almofadas estão ocupadas. Aguarde um pouco.
잠시 쉬어 가요.|Descanse um pouco.
방석이 모두 차 있어요.|Todas as almofadas estão ocupadas.
정자에서는 방석에 편하게 앉아 쉬어요.|Sente-se em uma almofada para descansar no gazebo.
낚싯대나 노를 내려놓은 뒤 의자를 펼 수 있어요.|Guarde a vara ou o remo antes de abrir a cadeira.
번뇌 -1|Uma preocupação a menos
방석을 눌러 쉬기|Clique na almofada para descansar
전갱이|Carapau
고등어|Cavala
도미|Pargo
낚싯대를 거뒀어요.|Vara recolhida.
작은 보트에 탔어요. 바다를 톡 하거나 방향키로 노를 저어요.|Você entrou no barco. Toque no mar ou use as setas para remar.
선착장에 내렸어요.|Você desembarcou no cais.
선착장에 내리기|Desembarcar no cais
멈추면 낚시 가능|Pare para pescar
바다를 톡 하거나 방향키로 노를 저어요|Toque no mar ou use as setas para remar
지금 낚아채기!|Puxar agora!
찌를 바라보는 중|Observando a boia
찌가 움직여요!|A boia se mexeu!
찰랑이는 물결을 보며 잠깐 기다려요|Espere um pouco e aprecie as ondas
보트 낚시 · 성공하면 꾸미기 선물을 얻어요|Pesca no barco · Pesque para ganhar acessórios
낚시 데크 · 성공하면 꾸미기 선물을 얻어요|Píer de pesca · Pesque para ganhar acessórios
보트 타기|Entrar no barco
작은 선착장 · 나무 보트를 타고 바다 한 바퀴|Pequeno cais · Passeie pelo mar de barco
찌가 톡톡! 지금 낚아채 보세요.|A boia se mexeu! Puxe agora.
물고기가 살짝 건드리고 갔어요. 다시 던져 볼까요?|O peixe escapou. Vamos tentar outra vez?
사랑해요|Carinho
신나요|Animação
고마워요|Gratidão
시무룩|Tristeza
깜짝이야|Surpresa
졸려요|Sono
크림|Creme
눈송이|Neve
버터|Manteiga
라떼|Café com leite
구름|Nuvem
복숭아|Pêssego
벚꽃|Flor de cerejeira
코코아|Cacau
민트|Menta
캐러멜|Caramelo
하양|Branco
귤빛|Tangerina
초코|Chocolate
은회색|Prateado
먹빛|Carvão
모래|Areia
하늘|Azul-céu
처음 펼치기 · {n}쪽|Começar a ler · {n} páginas
이어서 읽기 · {n} / {all}쪽|Continuar · {n} / {all} páginas
이야기 끝|Fim da história
{n} / {all}쪽|{n} / {all} páginas
이번 쉼에 머문 초|Segundos desta pausa
나뭇가지가 꽉 찼어요|O galho está cheio
그 자리엔 친구가 있어요|Este lugar está ocupado
코타츠 자리가 꽉 찼어요|O kotatsu está cheio
바구니가 비었어요. 조금 있으면 채워져요|A cesta está vazia. Logo haverá mais
침대가 꽉 찼어요|Todas as camas estão ocupadas
통통, {n}번 물수제비!|A pedrinha saltou {n} vezes!
잠수 준비 완료!|Pronto para mergulhar!
달빛 바다로 돌아왔어요|De volta ao mar ao luar
튜브 타기|Usar boia
달빛을 따라 멀리 떠나갔어요|Seguiu seu caminho ao luar
1시간|1 hora
{n}분 {seconds}초|{n} min {seconds} s
{n}분|{n} min
{n}초|{n} s
혹등고래|Baleia-jubarte
산호초 상어|Tubarão-de-recife
고래상어|Tubarão-baleia
보물이 다시 차오르는 중 · {time} 뒤에 열어요|O tesouro está se renovando · Abra em {time}
보물상자로 헤엄쳐 가요! 가까이 가면 열려요|Nade até o baú! Ele abre quando você se aproxima
상자는 한 번 열면 1시간 뒤에 다시 열 수 있어요|Cada baú pode ser aberto novamente após 1 hora
🪙 +{n} 코인! 바다 상점에서 사용해요|🪙 +{n} moedas! Use na loja do mar
{animal}가 유유히 헤엄치고 있어요|{animal} está nadando tranquilamente
조개가 작은 진주를 보여 줬어요|A concha mostrou uma pequena pérola
{time} 후 열기|Abrir em {time}
열기 · {n} 코인|Abrir · {n} moedas
느린 호흡|Respiração lenta
들이쉬고|Inspire
내쉬고|Expire
한숨 호흡|Suspiro relaxante
깊게 들이쉬고|Inspire profundamente
한 번 더|Mais uma vez
길게 내쉬고|Expire devagar
박스 호흡|Respiração quadrada
멈추고|Segure
여기 있어요|Estou aqui
멍이|Cachorrinho
멍이 보물 레이스|Corrida do tesouro
먼저 30칸에 도착!|Chegue primeiro à casa 30!
출발 ↑|Partida ↑
↗ 지름길 앞으로|↗ Atalho para avançar
↙ 미끄럼 뒤로|↙ Escorregão para voltar
숫자를 따라 지그재그로 가요|Siga os números em zigue-zague
주사위|Dado
주사위 굴리기|Rolar o dado
내 차례에 주사위를 톡 눌러요.|Clique no dado quando for sua vez.
멍이별 현재 위치|Posição dos jogadores
① 주사위 톡   ② 나온 수만큼 이동   ③ 보물섬 도착!|① Role o dado   ② Avance   ③ Chegue à ilha do tesouro!
다른 놀이 고르기|Escolher outro jogo
지름길|Atalho
미끄럼|Escorregão
도착|Chegada
보물섬|Ilha do tesouro
산책봇|Amigo virtual
주사위 {n}|Dado: {n}
{n}칸|Casa {n}
내 차례예요!|É sua vez!
{name} 차례|Vez de {name}
♛ {name} 승리!|♛ {name} venceu!
보물섬 도착!|Chegou à ilha do tesouro!
레이스 종료|Corrida encerrada
멍이가 이동하고 있어요|O cachorrinho está se movendo
친구를 응원해요|Torça pelos amigos
다시 한 판 할까요?|Mais uma partida?
산책봇이 생각 중…|O amigo virtual está pensando…
{n}초 · 기다리면 자동으로 굴려요|{n} s · O dado será rolado automaticamente
배구 조작|Controles do vôlei
배구 왼쪽으로 이동|Mover para a esquerda
배구 오른쪽으로 이동|Mover para a direita
← → 이동 · ↑ 또는 Space 점프|← → mover · ↑ ou Espaço para pular
휴대폰은 버튼을 꾹 눌러요|No celular, mantenha os botões pressionados
점프|Pular
숲속 멍이 배구|Vôlei na floresta
친구와 함께, 한 점씩 즐겁게|Divirta-se com os amigos, ponto a ponto
배구|Vôlei
배움터 입장|Entrar na sala de aula
숲속 배움터에 가요|Vamos à sala da floresta
친구들과 생각을 나누는 작은 교실이에요.|Uma pequena sala para compartilhar ideias com os amigos.
안내받은 비밀번호를 입력해 주세요.|Digite a senha fornecida pelo professor.
배움터 비밀번호|Senha da sala
돌아가기|Voltar
서버에 연결되면 들어갈 수 있어요. 잠시 후 다시 시도해 주세요.|Aguarde a conexão com o servidor e tente novamente.
연결을 확인하고 다시 눌러 주세요.|Verifique sua conexão e tente novamente.
연결이 끊겼어요. 다시 연결되면 들어와 주세요.|Conexão perdida. Entre novamente após reconectar.
숲속 배움터|Sala da floresta
오늘은 어떤 생각을 나눌까요?|Que ideias vamos compartilhar hoje?
멍이와 답변 팻말|Cachorrinhos e plaquinhas de respostas
서로의 생각에 천천히 귀 기울여요.|Escute com calma as ideias dos colegas.
보기 중 하나를 골라요|Escolha uma opção
내 팻말에 올릴 답|Minha resposta na plaquinha
내 생각을 적어 주세요|Escreva sua ideia
공개 전에는 나만 보여요|Só você pode ver antes da divulgação
팻말에 놓기|Colocar na plaquinha
운영 도구 열기|Abrir ferramentas do professor
배움터 운영 도구|Ferramentas do professor
진행자 전용|Somente para o professor
함께 생각을 나눠요|Vamos compartilhar ideias
운영 도구 닫기|Fechar ferramentas
응답 마감|Encerrar respostas
답 공개|Mostrar respostas
익명 취합 결과|Resultados anônimos
새 질문 만들기|Criar nova pergunta
질문 유형|Tipo de pergunta
객관식|Múltipla escolha
주관식|Resposta aberta
함께 생각할 질문|Pergunta para a turma
예: 오늘 가장 기대되는 일은 무엇인가요?|Ex.: O que você mais espera do dia de hoje?
보기 2~6개|De 2 a 6 opções
보기를 한 줄에 하나씩 적어 주세요|Escreva uma opção por linha
새 질문을 시작하면 이전 질문의 답은 비워져요.|Ao iniciar outra pergunta, as respostas anteriores serão apagadas.
질문 시작하기|Iniciar pergunta
칠판 비우기|Limpar quadro
대화 기록 지우기|Apagar histórico de conversa
팻말 답변 자세히 보기|Ver resposta completa
대화|Conversa
배움터 대화|Conversa da sala
도란도란 대화|Vamos conversar
배움터에 함께 있는 친구들이 봐요|As pessoas desta sala podem ver
대화 닫기|Fechar conversa
친구들과 나누는 대화|Conversa com os amigos
반가운 인사로 대화를 시작해 보세요.|Comece a conversa com um olá!
친구에게 전할 말|Mensagem para os amigos
함께 이야기해요|Vamos conversar
대화 전체 지우기|Apagar toda a conversa
연결을 확인하고 다시 보내 주세요.|Verifique a conexão e envie novamente.
전송을 확인하지 못했어요. 연결 후 다시 확인해 주세요.|Não foi possível confirmar o envio. Verifique após reconectar.
대화 · {n}|Conversa · {n}
대화 접기|Recolher conversa
연결이 끊겼어요. 마을로 나가 비밀번호를 입력하고 다시 들어와 주세요.|Conexão perdida. Volte à vila e entre novamente com a senha.
연결이 끊겼어요. 마을로 나가 다시 들어와 주세요.|Conexão perdida. Volte à vila e entre novamente.
연결이 끊겼어요. 마을에서 다시 들어와 주세요.|Conexão perdida. Entre novamente pela vila.
{answered}명 제출 · {online}명 참여|{answered} respostas · {online} participantes
{answered}명 제출 · {online}명 참여 · {state}|{answered} respostas · {online} participantes · {state}
주관식 · 내 생각을 자유롭게 적어요|Resposta aberta · Escreva sua ideia livremente
질문을 기다리며 편하게 앉아요|Sente-se e aguarde a pergunta
답 공개 후 이름 없이 취합한 결과를 볼 수 있어요.|Após divulgar as respostas, você verá os resultados anônimos.
바닥을 톡 누르거나 방향키로 자유롭게 걸어요.|Toque no chão ou use as setas para passear.
모두의 생각이 팻말에 펼쳐졌어요!|As ideias de todos estão nas plaquinhas!
응답을 마쳤어요. 곧 함께 답을 살펴봐요.|Respostas encerradas. Logo vamos conferir juntos.
내 팻말에 놓았어요. 마감 전에는 고칠 수 있어요.|Resposta enviada. Você pode editar antes do encerramento.
생각을 적어 내 멍이 앞 팻말에 놓아 주세요.|Escreva sua ideia na plaquinha do seu cachorrinho.
답 고쳐 놓기|Atualizar resposta
답 공개 완료|Respostas divulgadas
응답 받는 중|Recebendo respostas
질문 준비 중|Preparando pergunta
답 공개 후 선택지별 인원과 주관식 답변을 이름 없이 모아 보여줘요.|Após divulgar, veja as contagens e respostas sem os nomes.
제출된 답이 없어요.|Nenhuma resposta enviada.
{n}명|{n} pessoas
함께 생각해 봐요|Vamos pensar juntos
답변 완료|Resposta enviada
이 답변만 공개|Divulgar só esta resposta
배움터 정원 30명이 모두 찼어요. 자리가 나면 다시 들어와 주세요.|A sala atingiu o limite de 30 pessoas. Tente entrar quando houver uma vaga.
답변 완료 · 공개 대기|Resposta enviada · Aguardando divulgação
생각하고 있어요|Pensando…
둥근 자리로 돌아가기|Voltar à roda
내 자리|Meu lugar
도란도란 자리 {n}|Roda de conversa {n}
도란도란|Nossa roda
서로의 생각을 들어요|Vamos escutar uns aos outros
친구들이 모이는 자리|Ponto de encontro dos amigos
친구와 연결되면 놀이에 참가할 수 있어요|Conecte-se aos amigos para participar
놀이터 놀이|Jogos do parquinho
글램핑 옆 작은 운동장|Um pequeno pátio junto ao glamping
멍이 놀이터|Parquinho dos cachorrinhos
놀이 고르기|Escolher jogo
술래잡기|Pega-pega
숨바꼭질|Esconde-esconde
멍이 배구|Vôlei dos cachorrinhos
보물 레이스|Corrida do tesouro
참가|Participar
함께 시작|Começar juntos
참가 취소|Cancelar participação
놀이 방법|Como jogar
친구들과 연결하고 있어요…|Conectando aos amigos…
지금은 혼자 산책 중 · 함께 모이기 서버에서 친구와 놀 수 있어요|Passeando sozinho · Conecte-se ao servidor para brincar com amigos
참가 {n}/4 · 혼자면 산책봇과, 친구와는 함께 달려요|{n}/4 participantes · Jogue com amigos ou com o amigo virtual
참가 {n}/2 · 두 멍이가 모이면 배구를 시작해요|{n}/2 participantes · O vôlei precisa de dois cachorrinhos
참가 {n}/12 · 두 멍이 이상 모이면 시작해요|{n}/12 participantes · Começa com pelo menos dois cachorrinhos
주사위를 굴려 보물섬까지! · 30칸에 먼저 도착하면 승리|Role o dado! · Chegue primeiro à casa 30 para vencer
친구들의 보물 레이스를 구경해요 · 다음 판에 참가할 수 있어요|Assista à corrida dos amigos · Participe na próxima rodada
{n}초 뒤 서브! · 먼저 5점을 얻으면 이겨요|Saque em {n} s! · Vença com 5 pontos
친구들의 배구를 구경하고 있어요 · 다음 판에 만나요|Assista ao vôlei dos amigos · Participe na próxima rodada
득점! 잠시 뒤 다음 서브를 시작해요|Ponto! O próximo saque vem já
친구들이 노는 중 · {n}초 · 다음 판에 참가해요|Amigos jogando · {n} s · Participe na próxima rodada
잡혔어요! 친구들을 응원해요 · {n}초|Pegaram você! Torça pelos amigos · {n} s
한 판 더|Jogar novamente
산책봇과 시작|Jogar com amigo virtual
수색|Procurar
잡기|Pegar
나오기|Sair do esconderijo
숨기|Esconder
잎이 무성한 덤불 안으로 들어가서 숨기를 눌러요|Entre em um arbusto e clique em Esconder
멍이 숨바꼭질 정원|Jardim do esconde-esconde
숲속 멍이 놀이터|Parquinho na floresta
⚑ 술래|⚑ Pegador
꼭꼭 숨어라, 머리카락 보일라|Escondam-se bem!
친구들아, 먼저 달려!|Amigos, comecem a correr!
친구들이 준비하고 있어요. 잠깐 눈을 감아요.|Os amigos estão se preparando. Feche os olhos um pouco.
글램핑 옆 · 멍이 놀이터|Junto ao glamping · Parquinho
토끼 보닛|Touca de coelho
개구리 모자|Chapéu de sapo
딸기 베레모|Boina de morango
구름 모자|Chapéu de nuvem
복숭아 리본|Laço de pêssego
반짝별 목걸이|Colar de estrela
데이지 목걸이|Colar de margarida
하트 장갑|Luvas de coração
민트 발바닥 장갑|Luvas de patinhas menta
라일락 별 장갑|Luvas de estrelas lilás
마린 세일러 모자|Chapéu de marinheiro
상어 후드|Capuz de tubarão
바다 왕관|Coroa do mar
진주 목걸이|Colar de pérolas
조개 펜던트|Pingente de concha
닻 목걸이|Colar de âncora
파도 장갑|Luvas de ondas
산호 장갑|Luvas de coral
마린 줄무늬 티|Camiseta listrada
산호빛 니트|Suéter coral
고래 티셔츠|Camiseta de baleia
별빛 조끼|Colete de estrelas
`.trim().split('\n').map(line => { const at = line.indexOf('|'); return [line.slice(0, at), line.slice(at + 1)]; }));
})(window.MC = window.MC || {});
