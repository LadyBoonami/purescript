module Main where

import Data.List
import Data.Maybe
import Prelude
import Effect
import Effect.Console
import Effect.Random
import Partial.Unsafe

{-

bench :: (Int -> Int) -> Int -> Int -> Int
bench _ acc 0 = acc
bench f acc n = bench f (acc + f 1) (n - 1)



main :: Effect Unit
main = logShow $ bench (\x -> x) 0 1000000

-- -}

-- {-

depth :: Number -> Number -> Int
depth r i = steps - depth' steps r i r i
    where
        steps :: Int
        steps = 10000

        depth' :: Int -> Number -> Number -> Number -> Number -> Int
        depth' 0 _  _  _ _ = -1
        depth' s r0 i0 r i = if r*r + i*i >= 4.0
                                then s
                                else depth' (s-1)
                                            r0
                                            i0
                                            (r*r - i*i + r0)
                                            (2.0 * r * i + i0)

pixel :: Int -> String
pixel -1          = " "
pixel n | n <=  1 = " "
pixel n | n <=  2 = "."
pixel n | n <=  3 = "-"
pixel n | n <=  4 = "~"
pixel n | n <=  5 = ":"
pixel n | n <=  6 = "+"
pixel n | n <=  7 = "*"
pixel n | n <=  8 = "?"
pixel n | n <=  9 = "X"
pixel n | n <= 10 = "&"
pixel n | n <= 15 = "@"
pixel n | n <= 20 = "$"
pixel _           = "#"

pict :: Number -> Number -> Number -> Number -> Number -> Number -> String
pict rmin rmax rstep imin imax istep
    | imin >= imax = ""
    | otherwise    = row rmin rmax rstep imin <> "\n"
                  <> pict rmin rmax rstep (imin+istep) imax istep
    where
        row :: Number -> Number -> Number -> Number -> String
        row rmin rmax rstep i
            | rmin >= rmax = ""
            | otherwise    = pixel (depth rmin i)
                          <> row (rmin+rstep) rmax rstep i

main :: Effect Unit
main = log $ pict (-2.0) 1.0 0.04 (-1.4) 1.4 0.06

-- -}

{-

randomList :: Effect (List Int)
randomList = shuffle $ 1..1000

shuffle :: List Int -> Effect (List Int)
shuffle Nil = pure Nil
shuffle l   = do
    n  <- randomInt 0 $ length l - 1
    l' <- shuffle (take n l <> drop (n+1) l)
    pure $ Cons (unsafePartial $ fromJust $ l !! n) l'

qsort :: List Int -> List Int
qsort Nil         = Nil
qsort (Cons x xs) = qsort (filter (\i -> i < x) xs) <> singleton x <> qsort (filter (\i -> i >= x) xs)

main :: Effect Unit
main = do
    l <- randomList
    logShow $ qsort l

-- -}
