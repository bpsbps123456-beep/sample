# sounds/ — 실제로 녹음한 자연의 소리

출처와 허락은 `../README.md`의 '소리의 출처'에 있습니다. 여기에는 파일을 어떻게 만들었는지 적어 둡니다.
녹음을 바꾸거나 더할 때 같은 방법을 따르면 됩니다.

## 만든 방법 (ffmpeg)

1. 필요한 길이만 자르고, 웅웅거리는 낮은 소리를 덜어 냅니다(`highpass` 두 번 = 24dB/옥타브).
2. 가장 큰 순간이 -1dBFS가 되도록 크기를 맞춥니다. 실제로 들리는 크기는 `js/audio.js`의 상수(`FireScape.BED` 등)로 정합니다.
3. 바탕 소리는 32kHz 고정 비트레이트, 모닥불은 또렷해야 해서 44.1kHz VBR로 담습니다.

| 파일 | 원본에서 | 거른 것 | 담은 꼴 |
| --- | --- | --- | --- |
| `fire.mp3` | Bonfire 두 토막의 왼쪽·오른쪽을 따로 모노로 떼어 네 토막을 0.25초씩 겹쳐 이음(35초) | 55Hz 아래, 아주 센 타닥은 `alimiter`(-12dBFS)로 미리 누름 | 모노, VBR `-q:a 4` |
| `stove.mp3` | Fireplace 25.5초 | 85Hz 아래 | 모노 48k |
| `crickets.mp3` | 처음 32초 | 260Hz 아래 (먼 차 소리·바람) | 모노 48k, 32kHz |
| `birds.mp3` | 처음 80초 | 150Hz 아래 | 스테레오 64k, 32kHz |
| `stream.mp3` | 2초부터 36초 | 140Hz 아래 (마이크 바람), 한 번 크게 튀는 물소리는 `alimiter`(-6dBFS)로 누름 | 스테레오 64k, 32kHz |
| `rain.mp3` | 58초부터 32초 | 120Hz 아래 | 스테레오 56k, 32kHz |
| `sea.mp3` | 처음 48초 | 60Hz 아래, `dynaudnorm`으로 크기를 고르게 눌러 물의 결만 남김 | 스테레오 64k, 32kHz |
| `wood-land-1.mp3`, `wood-land-2.mp3` | Kenney Impact Sounds 1.0의 `impactWood_medium_000.ogg`, `001.ogg` (각 0.33초) | 65Hz 아래와 2.4kHz 위를 덜고 마지막 0.1초를 페이드아웃. 추가 타닥·잡음·잔향 없음 | 모노 64k, 32kHz |

```bash
# 예: 풀벌레
ffmpeg -ss 0 -t 32 -i summer-night.ogg -ac 1 -af "highpass=f=260,highpass=f=260" tmp.wav
ffmpeg -i tmp.wav -af volumedetect -f null -          # max_volume 을 보고
ffmpeg -i tmp.wav -af "volume=+12.5dB" -ar 32000 -c:a libmp3lame -b:a 48k crickets.mp3
```

## 모닥불의 타닥 자리 (`marks`)

`js/audio.js`의 `SAMPLES.fire.marks`, `SAMPLES.stove.marks`는 녹음 속 '타닥'의 자리(밀리초)와 세기(0~99)입니다.
화면은 이 순간에 맞춰 불티를 튀깁니다. 녹음을 바꾸면 다시 구해야 합니다.

- 2kHz 위만 남긴 소리를 2ms마다 가장 큰 값으로 보고, 주변 0.6초의 가운데값보다 10dB 넘게 솟은 봉우리를 찾습니다(40ms 안의 것은 하나로).
- 세기는 솟은 정도를 0~99로 고칩니다: 모닥불은 10~50dB, 난로는 10~34dB를 0~99로.
- 녹음 맨 앞뒤 0.15초는 빼고, 너무 약한 것(모닥불 20 미만, 난로 5 미만)은 버립니다.
